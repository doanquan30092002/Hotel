-- CreateEnum
CREATE TYPE "FinanceTxType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateTable
CREATE TABLE "FinanceTx" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "FinanceTxType" NOT NULL,
    "groupId" TEXT NOT NULL,
    "bookingId" TEXT,
    "methodId" TEXT,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "occurredAt" DATE NOT NULL,
    "createdById" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "FinanceTx_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FinanceTx_code_key" ON "FinanceTx"("code");

-- CreateIndex
CREATE INDEX "FinanceTx_type_idx" ON "FinanceTx"("type");

-- CreateIndex
CREATE INDEX "FinanceTx_groupId_idx" ON "FinanceTx"("groupId");

-- CreateIndex
CREATE INDEX "FinanceTx_bookingId_idx" ON "FinanceTx"("bookingId");

-- CreateIndex
CREATE INDEX "FinanceTx_occurredAt_idx" ON "FinanceTx"("occurredAt");

-- CreateIndex
CREATE INDEX "FinanceTx_deletedAt_idx" ON "FinanceTx"("deletedAt");

-- AddForeignKey
ALTER TABLE "FinanceTx" ADD CONSTRAINT "FinanceTx_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceTx" ADD CONSTRAINT "FinanceTx_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceTx" ADD CONSTRAINT "FinanceTx_methodId_fkey" FOREIGN KEY ("methodId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceTx" ADD CONSTRAINT "FinanceTx_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
