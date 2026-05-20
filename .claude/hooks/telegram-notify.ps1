<#
.SYNOPSIS
  Sends a Telegram notification on Claude Code hook events.

.DESCRIPTION
  - Reads hook payload from stdin (JSON).
  - Loads TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID from env or .claude/settings.local.json.
  - For SubagentStop: parses transcript for REVIEW_RESULT / TEST_RESULT marker, updates
    .claude/state/last-checks.json, and triggers auto-deploy if both PASS.
  - Always exits 0 so Claude Code is never blocked by a Telegram failure.

.PARAMETER Event
  Stop | SubagentStop | Notification | Test
#>

param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('Stop', 'SubagentStop', 'Notification', 'Test')]
  [string]$Event
)

$ErrorActionPreference = 'Continue'
$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$StateDir = Join-Path $ProjectRoot '.claude\state'
$LastChecksPath = Join-Path $StateDir 'last-checks.json'
$LogPath = Join-Path $StateDir 'telegram-hook.log'

if (-not (Test-Path $StateDir)) { New-Item -ItemType Directory -Path $StateDir -Force | Out-Null }

function Write-Log($msg) {
  $line = "[{0}] [{1}] {2}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Event, $msg
  Add-Content -Path $LogPath -Value $line -Encoding utf8
}

# ---------- Load secrets ----------
function Get-Secret([string]$name) {
  $val = [Environment]::GetEnvironmentVariable($name)
  if ($val) { return $val }
  $localPath = Join-Path $ProjectRoot '.claude\settings.local.json'
  if (Test-Path $localPath) {
    try {
      $local = Get-Content $localPath -Raw -Encoding utf8 | ConvertFrom-Json
      if ($local.env -and $local.env.PSObject.Properties.Name -contains $name) {
        return $local.env.$name
      }
    } catch { Write-Log "Failed to parse settings.local.json: $_" }
  }
  return $null
}

$Token = Get-Secret 'TELEGRAM_BOT_TOKEN'
$ChatId = Get-Secret 'TELEGRAM_CHAT_ID'

if (-not $Token -or -not $ChatId) {
  Write-Log "Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID - skipping notification."
  exit 0
}

# ---------- Read payload from stdin (best-effort, async with timeout) ----------
# Claude Code pipes JSON to stdin for real hook events. For manual Test runs there is
# no piped data; we must not block waiting forever. Use async ReadToEndAsync + 500ms wait.
$payload = $null
if ($Event -ne 'Test') {
  try {
    $task = [Console]::In.ReadToEndAsync()
    if ($task.Wait(500)) {
      $stdinText = $task.Result
      if ($stdinText -and $stdinText.Trim()) {
        $payload = $stdinText | ConvertFrom-Json -ErrorAction Stop
      }
    } else {
      Write-Log "stdin read timed out (500ms) - treating as no payload"
    }
  } catch {
    Write-Log "stdin read failed: $_"
  }
}

$sessionId = 'n/a'
if ($payload -and $payload.session_id) {
  $sessionId = $payload.session_id.Substring(0, [Math]::Min(8, $payload.session_id.Length))
}
$transcriptPath = $null
$toolName = $null
if ($payload) {
  $transcriptPath = $payload.transcript_path
  $toolName = $payload.tool_name
}

# ---------- Read PROGRESS.md to find current phase ----------
$phase = 'unknown'
$progressPath = Join-Path $ProjectRoot 'PROGRESS.md'
if (Test-Path $progressPath) {
  $line = Select-String -Path $progressPath -Pattern '^\*\*Current phase\*\*' | Select-Object -First 1
  if ($line) { $phase = ($line.Line -replace '\*\*Current phase\*\*\s*:\s*', '').Trim() }
}

# ---------- Parse transcript for markers on SubagentStop ----------
$reviewResult = $null
$testResult = $null
if ($Event -eq 'SubagentStop' -and $transcriptPath -and (Test-Path $transcriptPath)) {
  try {
    $tail = Get-Content $transcriptPath -Tail 500 -Encoding utf8 -ErrorAction Stop
    foreach ($line in $tail) {
      if ($line -match 'REVIEW_RESULT:\s*(PASS|FAIL)(\s*[-—]\s*(.+))?') {
        $reviewResult = @{ status = $Matches[1]; reason = $Matches[3]; at = (Get-Date).ToString('o'); phase = $phase }
      }
      if ($line -match 'TEST_RESULT:\s*(PASS|FAIL)(\s*[-—]\s*(.+))?') {
        $testResult = @{ status = $Matches[1]; reason = $Matches[3]; at = (Get-Date).ToString('o'); phase = $phase }
      }
    }
  } catch { Write-Log "Failed to read transcript: $_" }
}

# ---------- Update last-checks state ----------
$state = @{ review = $null; test = $null; lastDeployedPhase = $null; lastDeployUrl = $null; lastDeployAt = $null }
if (Test-Path $LastChecksPath) {
  try {
    $existing = Get-Content $LastChecksPath -Raw -Encoding utf8 | ConvertFrom-Json
    foreach ($k in 'review','test','lastDeployedPhase','lastDeployUrl','lastDeployAt') {
      if ($existing.PSObject.Properties.Name -contains $k) { $state[$k] = $existing.$k }
    }
  } catch { Write-Log "last-checks.json parse failed: $_" }
}
if ($reviewResult) { $state.review = $reviewResult }
if ($testResult) { $state.test = $testResult }
$state | ConvertTo-Json -Depth 5 | Set-Content -Path $LastChecksPath -Encoding utf8

# ---------- Build message ----------
$timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm'
$header = switch ($Event) {
  'Stop'         { '[Hotel] [OK] Turn finished' }
  'SubagentStop' { '[Hotel] [OK] Subagent finished' }
  'Notification' { '[Hotel] [!] Needs approval' }
  'Test'         { '[Hotel] [TEST] Hook test OK' }
}

$body = @()
$body += $header
$body += "Phase: $phase"
$body += "Session: $sessionId"
if ($toolName) { $body += "Tool: $toolName" }
if ($reviewResult) {
  $reason = ''
  if ($reviewResult.reason) { $reason = ' - ' + $reviewResult.reason }
  $body += "Review: $($reviewResult.status)$reason"
}
if ($testResult) {
  $reason = ''
  if ($testResult.reason) { $reason = ' - ' + $testResult.reason }
  $body += "Test: $($testResult.status)$reason"
}
$body += "Time: $timestamp"
$message = $body -join "`n"

# ---------- Send to Telegram ----------
try {
  $uri = "https://api.telegram.org/bot$Token/sendMessage"
  $form = @{ chat_id = $ChatId; text = $message; disable_web_page_preview = $true }
  Invoke-RestMethod -Uri $uri -Method Post -Body $form -ContentType 'application/x-www-form-urlencoded; charset=utf-8' -TimeoutSec 10 | Out-Null
  Write-Log "Sent: $($body[0])"
} catch {
  Write-Log "Telegram send failed: $_"
}

# ---------- Trigger auto-deploy if both PASS for same phase ----------
if ($Event -eq 'SubagentStop' -and $state.review -and $state.test) {
  if ($state.review.status -eq 'PASS' -and $state.test.status -eq 'PASS' -and $state.review.phase -eq $state.test.phase) {
    if ($state.lastDeployedPhase -ne $state.review.phase) {
      $autoDeploy = Join-Path $ProjectRoot '.claude\hooks\auto-deploy.ps1'
      if (Test-Path $autoDeploy) {
        Write-Log "Triggering auto-deploy for phase $($state.review.phase)"
        Start-Process powershell -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File',$autoDeploy -WindowStyle Hidden
      }
    } else {
      Write-Log "Phase $($state.review.phase) already deployed - skip."
    }
  }
}

exit 0
