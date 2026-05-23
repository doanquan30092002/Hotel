-- Drop Staff.departmentId column + STAFF_DEPARTMENT enum value
-- Rationale: department and position were overlapping; user chose to keep position only.

-- 1. Drop FK constraint + column on Staff
ALTER TABLE "Staff" DROP CONSTRAINT IF EXISTS "Staff_departmentId_fkey";
DROP INDEX IF EXISTS "Staff_departmentId_idx";
ALTER TABLE "Staff" DROP COLUMN IF EXISTS "departmentId";

-- 2. Delete Category rows referring to STAFF_DEPARTMENT (no other FK still references them)
DELETE FROM "Category" WHERE "group" = 'STAFF_DEPARTMENT';

-- 3. Recreate CategoryGroup enum without STAFF_DEPARTMENT (Postgres cannot drop enum values directly)
ALTER TYPE "CategoryGroup" RENAME TO "CategoryGroup_old";

CREATE TYPE "CategoryGroup" AS ENUM (
  'ROOM_TYPE',
  'ROOM_AREA',
  'ROOM_STATUS',
  'CLEANING_STATUS',
  'PRICE_TYPE',
  'PAYMENT_METHOD',
  'BOOKING_SOURCE',
  'BOOKING_STATUS',
  'HOUSEKEEPING_TASK_STATUS',
  'FINANCE_GROUP',
  'GUEST_SOURCE',
  'UNIT',
  'SERVICE_GROUP',
  'SURCHARGE_TYPE',
  'STAFF_POSITION',
  'PAYROLL_STATUS'
);

ALTER TABLE "Category"
  ALTER COLUMN "group" TYPE "CategoryGroup"
  USING "group"::text::"CategoryGroup";

DROP TYPE "CategoryGroup_old";
