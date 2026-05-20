<#
.SYNOPSIS
  Auto git-commit + push current branch + trigger Vercel/Railway preview, then notify Telegram.

.DESCRIPTION
  Triggered by telegram-notify.ps1 when both REVIEW_RESULT and TEST_RESULT are PASS for the
  same phase. Hard guards:
    - Never push to `main` (only current feature branch).
    - Never promote production (Vercel/Railway preview only).
    - Killed if .claude/state/auto-deploy.disabled exists.
    - Killed if AUTO_DEPLOY_ENABLED != "true".
    - Cooldown 60s.
#>

$ErrorActionPreference = 'Continue'
$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
Set-Location $ProjectRoot

$StateDir = Join-Path $ProjectRoot '.claude\state'
$LastChecksPath = Join-Path $StateDir 'last-checks.json'
$KillSwitch = Join-Path $StateDir 'auto-deploy.disabled'
$LogPath = Join-Path $StateDir 'auto-deploy.log'

if (-not (Test-Path $StateDir)) { New-Item -ItemType Directory -Path $StateDir -Force | Out-Null }

function Write-Log($msg) {
  $line = "[{0}] {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $msg
  Add-Content -Path $LogPath -Value $line -Encoding utf8
}

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
    } catch {}
  }
  return $null
}

function Send-Telegram([string]$text) {
  $tok = Get-Secret 'TELEGRAM_BOT_TOKEN'
  $cid = Get-Secret 'TELEGRAM_CHAT_ID'
  if (-not $tok -or -not $cid) { return }
  try {
    Invoke-RestMethod -Uri "https://api.telegram.org/bot$tok/sendMessage" `
      -Method Post `
      -Body @{ chat_id = $cid; text = $text; disable_web_page_preview = $true } `
      -ContentType 'application/x-www-form-urlencoded; charset=utf-8' `
      -TimeoutSec 10 | Out-Null
  } catch { Write-Log "Telegram failed: $_" }
}

# ---------- Gate 1: kill switch ----------
if (Test-Path $KillSwitch) {
  Write-Log "Kill switch present - skip."
  exit 0
}

# ---------- Gate 2: feature flag ----------
$enabled = Get-Secret 'AUTO_DEPLOY_ENABLED'
if ($enabled -ne 'true') {
  Write-Log "AUTO_DEPLOY_ENABLED != 'true' - skip."
  exit 0
}

# ---------- Gate 3: cooldown ----------
if (Test-Path $LastChecksPath) {
  try {
    $state = Get-Content $LastChecksPath -Raw -Encoding utf8 | ConvertFrom-Json
    if ($state.lastDeployAt) {
      $age = (Get-Date) - [datetime]::Parse($state.lastDeployAt)
      if ($age.TotalSeconds -lt 60) {
        Write-Log ("Cooldown: last deploy was {0:N0}s ago - skip." -f $age.TotalSeconds)
        exit 0
      }
    }
  } catch {}
}

# ---------- Gate 4: not on main ----------
$branch = (& git rev-parse --abbrev-ref HEAD 2>$null).Trim()
if (-not $branch) {
  Write-Log "Not a git repo - skip."
  exit 0
}
if ($branch -eq 'main' -or $branch -eq 'master') {
  Write-Log "Refusing to auto-push from $branch."
  Send-Telegram "[Hotel] [!] auto-deploy skipped: on protected branch '$branch'"
  exit 0
}

# ---------- Read state for commit message ----------
$phaseSlug = 'change'
$reviewReason = ''
if (Test-Path $LastChecksPath) {
  try {
    $state = Get-Content $LastChecksPath -Raw -Encoding utf8 | ConvertFrom-Json
    if ($state.review -and $state.review.phase) {
      $phaseSlug = ($state.review.phase -replace '[^a-zA-Z0-9]+', '-' -replace '^-|-$', '').ToLower()
    }
    if ($state.review -and $state.review.reason) { $reviewReason = $state.review.reason }
  } catch {}
}

# ---------- Stage + commit ----------
$status = & git status --porcelain
if (-not $status) {
  Write-Log "Nothing to commit. Continue to deploy trigger anyway."
} else {
  & git add -A
  $msg = "feat($phaseSlug): auto commit after review+test pass`n`nReview: $reviewReason"
  # Commit goes through husky pre-commit (lint + typecheck)
  $commitOutput = & git commit -m $msg 2>&1
  if ($LASTEXITCODE -ne 0) {
    Write-Log "Commit failed (likely pre-commit hook): $commitOutput"
    Send-Telegram "[Hotel] [!] auto-deploy: commit BLOCKED by pre-commit on branch '$branch'`n`n$($commitOutput | Select-Object -Last 5 | Out-String)"
    exit 0
  }
}

# ---------- Push ----------
$remote = Get-Secret 'GIT_REMOTE'
if (-not $remote) { $remote = 'origin' }
$pushOutput = & git push $remote $branch 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Log "Push failed: $pushOutput"
  Send-Telegram "[Hotel] [!] auto-deploy: PUSH FAILED on '$branch'`n`n$($pushOutput | Select-Object -Last 5 | Out-String)"
  exit 0
}

$shortSha = (& git rev-parse --short HEAD).Trim()
$lastCommitSubject = (& git log -1 --pretty=%s).Trim()

# ---------- Wait for Vercel + Railway preview ----------
# Vercel & Railway are configured for Git integration -> they auto-deploy on push.
# We just wait a bit and try to fetch URLs via CLI if available.

Start-Sleep -Seconds 8

$vercelUrl = '(deploying - check Vercel dashboard)'
$railwayUrl = '(deploying - check Railway dashboard)'

if (Get-Command vercel -ErrorAction SilentlyContinue) {
  try {
    $vercelJson = & vercel ls --json 2>$null | Out-String
    if ($vercelJson) {
      $list = $vercelJson | ConvertFrom-Json
      $match = $list | Where-Object { $_.meta.githubCommitRef -eq $branch } | Select-Object -First 1
      if ($match -and $match.url) { $vercelUrl = "https://$($match.url)" }
    }
  } catch { Write-Log "vercel ls failed: $_" }
}

# Railway URL: typically a fixed domain per service. Read from settings if user set it.
$railwayDomain = Get-Secret 'RAILWAY_PUBLIC_DOMAIN'
if ($railwayDomain) { $railwayUrl = "https://$railwayDomain" }

# ---------- Update state ----------
$nowIso = (Get-Date).ToString('o')
if (Test-Path $LastChecksPath) {
  try {
    $state = Get-Content $LastChecksPath -Raw -Encoding utf8 | ConvertFrom-Json
    $state | Add-Member -NotePropertyName lastDeployedPhase -NotePropertyValue $state.review.phase -Force
    $state | Add-Member -NotePropertyName lastDeployUrl -NotePropertyValue $vercelUrl -Force
    $state | Add-Member -NotePropertyName lastDeployAt -NotePropertyValue $nowIso -Force
    $state | ConvertTo-Json -Depth 5 | Set-Content $LastChecksPath -Encoding utf8
  } catch {}
}

# ---------- Notify ----------
$timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm'
$lines = @(
  '[Hotel] [OK] Auto-deployed (preview)'
  "Branch: $branch"
  "Commit: $shortSha - $lastCommitSubject"
  "Web:  $vercelUrl"
  "API:  $railwayUrl"
  "Time: $timestamp"
)
Send-Telegram ($lines -join "`n")
Write-Log "Auto-deploy complete on $branch ($shortSha)"

exit 0
