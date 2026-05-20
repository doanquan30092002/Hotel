# Git Workflow

## Branches

- `main`: protected. Production source of truth. Chỉ merge qua PR.
- `feat/<phase-number>-<slug>`: branch làm việc cho mỗi phase (vd `feat/06-bookings`).
- `fix/<slug>`, `chore/<slug>`, `docs/<slug>` cho task ngoài phase.

## Commit messages — Conventional Commits

```
<type>(<scope>): <subject>

<body — tùy chọn, giải thích why>
```

`type`: `feat | fix | chore | refactor | docs | test | perf | build | ci`.
`scope`: tên module (`bookings`, `rooms`, `dashboard`, ...) hoặc `infra`, `deps`.

Ví dụ:
```
feat(bookings): support multi-room booking with surcharge & discount
fix(rooms): correct weekend price calculation across DST boundary
chore(deps): bump prisma to 5.x
```

## Auto-commit by hook

Khi `code-reviewer` + `tester` cùng PASS, `.claude/hooks/auto-deploy.ps1` tự:
1. `git add -A`
2. `git commit -m "feat(<phase>): <summary> [auto: review+test pass]"`
3. `git push origin <current-branch>`

Hook KHÔNG bao giờ:
- Push thẳng lên `main`
- `--force` / `--no-verify`
- Promote production deploy

## Pre-commit (husky)

`pnpm lint && pnpm typecheck` chạy trước mỗi commit. Fail → commit huỷ.

## PR

- Mở từ branch `feat/...` vào `main`.
- Title = subject của commit chính.
- Body cần: Summary (1-3 bullet) + Test plan (checklist).
- Reviewer: ít nhất 1 người (hoặc chính chủ project nếu solo).
- Vercel + Railway tự tạo preview deployment, link tự đăng comment vào PR.

## Hard rules

- Không commit `.env`, `.claude/settings.local.json`, secrets.
- Không `git reset --hard` trên branch đã push.
- Không xóa branch chưa merge mà không xác nhận.
