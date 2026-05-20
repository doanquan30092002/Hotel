---
name: add-module
description: Scaffold a new full-stack module (BE + FE) for the Hotel project. Use when user says "thêm module X", "scaffold module X", or starting a new phase. Takes module slug as arg.
---

# add-module

Scaffold đầy đủ 1 module Hotel: Prisma model + NestJS module + FE page + menu entry + test stub + PROGRESS update.

## Args

`<module-slug>` — kebab-case, vd `bookings`, `customers`, `housekeeping`.

## Steps

1. **Confirm scope** với user nếu chưa rõ: fields, RBAC roles, đặc thù (vd bookings có multi-row item).

2. **Prisma** — append model vào `apps/api/prisma/schema.prisma`:
   ```prisma
   model <PascalName> {
     id        String   @id @default(cuid())
     code      String   @unique
     // ... fields
     createdAt DateTime @default(now())
     updatedAt DateTime @updatedAt
     deletedAt DateTime?
   }
   ```
   Migration:
   ```powershell
   cd apps/api
   npx prisma migrate dev --name <phase>_<slug>
   ```

3. **NestJS** — tạo `apps/api/src/<slug>/`:
   - `<slug>.module.ts`
   - `<slug>.service.ts` (inject PrismaService; CRUD + filter + paginate)
   - `<slug>.controller.ts` (`@Controller('<slug>')`, full RBAC decorators)
   - `dto/create-<slug>.dto.ts`, `dto/update-<slug>.dto.ts`, `dto/query-<slug>.dto.ts`
   - `entities/<slug>.entity.ts`
   - Register module trong `app.module.ts`.

4. **Swagger** — `@ApiTags('<Slug>')` + `@ApiOperation` + `@ApiResponse` cho mỗi endpoint.

5. **e2e test** — `apps/api/test/<slug>.e2e-spec.ts`: cover create / list / get / update / delete + 1 RBAC denial + 1 validation 400.

6. **Frontend** — tạo `apps/web/src/app/(dashboard)/<slug>/page.tsx` + components:
   - `components/<slug>/<Slug>Table.tsx` (DataTable wrapper)
   - `components/<slug>/<Slug>Form.tsx` (React Hook Form + zod)
   - `lib/hooks/use<Slug>.ts` (TanStack Query queries + mutations)
   - Compare visually với ảnh template tương ứng trong `TemplateImage/`.

7. **Menu entry** — thêm vào sidebar config (`apps/web/src/components/layout/Sidebar.tsx`): label tiếng Việt, icon lucide-react, href.

8. **Update PROGRESS.md** — tick checkbox phase, ghi "Currently working on", thêm "Decisions log" nếu có.

9. **Memory append** — bổ sung pattern mới (nếu phát hiện) vào agent-memory.

10. **Run gates**:
    ```powershell
    pnpm api:lint; pnpm api:typecheck; pnpm api:test:e2e
    pnpm web:lint; pnpm web:typecheck
    ```
    Tất cả phải pass trước khi gọi code-reviewer + tester.

## Output to user

Một danh sách file đã tạo (link `[path](path)`) + lệnh để test thử.
