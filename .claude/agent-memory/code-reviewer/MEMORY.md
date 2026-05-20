# Code Reviewer Memory

## Conventions

- Luôn chạy lint + typecheck + test trước rồi mới đọc diff.
- Output LUÔN kết thúc bằng `REVIEW_RESULT: PASS|FAIL — <reason>` ở dòng cuối cùng.

## Recurring issues to watch

- _(trống — thêm khi tìm thấy lỗi lặp)_

## Severity rubric

| Mức | Khi nào | Hành động |
|---|---|---|
| Blocker | Lỗ hổng bảo mật, secret commit, mất dữ liệu | FAIL ngay |
| Major | Vi phạm api-contract, RBAC thiếu, any/ts-ignore không lý do | FAIL |
| Minor | Thiếu test cho 1 edge, thiếu loading state | PASS kèm "to fix" |
| Nit | Đặt tên, vị trí file, formatting | PASS kèm gợi ý |

## Decisions

- _(trống)_
