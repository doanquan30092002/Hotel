# Coding Style

## TypeScript

- `"strict": true`, `"noUncheckedIndexedAccess": true`, `"exactOptionalPropertyTypes": true`.
- Không dùng `any`. Nếu thật sự cần, dùng `unknown` rồi narrow.
- Không dùng `@ts-ignore` / `@ts-expect-error` mà không có lý do trong comment.
- Prefer functional patterns: `map`/`filter`/`reduce` over imperative loops khi rõ ràng hơn.

## Naming

- File: `kebab-case.ts`. Component file: `Button.tsx` (PascalCase) — chỉ cho file export 1 component.
- Variable / function: `camelCase`. Constants: `UPPER_SNAKE_CASE`.
- Class: `PascalCase`. Interface / type alias: `PascalCase`, không prefix `I`.
- Boolean: `is*`, `has*`, `should*`.
- Enum: `PascalCase`, value `UPPER_SNAKE`.

## Language

- Identifiers / comments / commit message: tiếng Anh.
- UI label, error message hiển thị cho user, seed data demo: tiếng Việt.
- Validation message (class-validator / zod): tiếng Việt — đây là thông điệp user thấy.

## Formatting

- Prettier (mặc định) + ESLint. Không sửa file format mà không dùng tool.
- Width 100. Single quote. Trailing comma `all`. Semicolons on.

## Imports

- Order: built-in → external → internal absolute (`@/`) → relative. Tách block bằng dòng trống.
- Không `import *` (trừ khi unavoidable).
- Không circular imports (ESLint phát hiện).

## Errors

- Throw `HttpException` con cụ thể (`BadRequestException`, `NotFoundException`, ...) — KHÔNG throw `Error` trần trong controller/service.
- Catch + re-throw chỉ khi bổ sung context.

## Async

- Luôn `await` Promise. Không trả Promise chưa await trừ khi cố ý (return từ async function).
- Không `async` function không có `await`.
