---
name: update-progress
description: Update PROGRESS.md based on current git status and recent commits. Use when finishing a task, before stopping a session, or when user says "cập nhật progress".
---

# update-progress

Tự động cập nhật `PROGRESS.md` theo trạng thái hiện tại.

## Steps

1. **Đọc state hiện tại**:
   ```powershell
   git branch --show-current
   git status --short
   git log --oneline -10
   ```

2. **Đọc `PROGRESS.md`** hiện tại.

3. **Cập nhật các section**:

   ### Header
   - `Last updated`: ngày hôm nay (ISO).
   - `Current phase`: đọc từ branch name (`feat/06-bookings` → `Phase 6 — Bookings`) hoặc giữ nguyên nếu không rõ.
   - `Active branch`: branch hiện tại.

   ### Phase status
   - Tick `[x]` cho phase / subtask đã hoàn thành (xác minh qua diff hoặc files đã tạo).

   ### Currently working on
   - Liệt kê file đã modified gần nhất (từ `git status`).
   - 1 dòng "Next action" — hỏi user nếu không tự suy ra được.
   - "Blockers" nếu có.

   ### Decisions log
   - Thêm dòng mới nếu có quyết định kỹ thuật mới trong session (vd: chọn lib X vì Y).
   - Format: `- <YYYY-MM-DD>: <decision>`.

4. **Edit `PROGRESS.md`** với các thay đổi trên (dùng Edit tool, không Write toàn file trừ khi cần thiết).

5. **Tóm tắt cho user** (3-5 dòng): những gì đã cập nhật.

## Hard rules

- KHÔNG commit file PROGRESS.md tự động — để user tự gộp vào commit cuối phase.
- KHÔNG xóa entries cũ trong "Decisions log".
- KHÔNG tick phase đã hoàn thành nếu chưa có evidence (file hoặc commit).
