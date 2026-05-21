-- CreateEnum
CREATE TYPE "CategoryGroup" AS ENUM ('ROOM_TYPE', 'ROOM_AREA', 'ROOM_STATUS', 'CLEANING_STATUS', 'PRICE_TYPE', 'PAYMENT_METHOD', 'BOOKING_SOURCE', 'BOOKING_STATUS', 'HOUSEKEEPING_TASK_STATUS', 'FINANCE_GROUP', 'GUEST_SOURCE', 'UNIT', 'SERVICE_GROUP', 'SURCHARGE_TYPE');

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "group" "CategoryGroup" NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Category_group_active_sortOrder_idx" ON "Category"("group", "active", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Category_group_code_key" ON "Category"("group", "code");
