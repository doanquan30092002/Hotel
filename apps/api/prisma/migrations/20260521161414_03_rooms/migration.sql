-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "typeId" TEXT NOT NULL,
    "areaId" TEXT,
    "capacity" INTEGER NOT NULL DEFAULT 2,
    "basePrice" DECIMAL(15,2) NOT NULL,
    "weekendPrice" DECIMAL(15,2),
    "holidayPrice" DECIMAL(15,2),
    "statusId" TEXT NOT NULL,
    "cleaningStatusId" TEXT NOT NULL,
    "defaultCheckIn" TEXT,
    "defaultCheckOut" TEXT,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Room_code_key" ON "Room"("code");

-- CreateIndex
CREATE INDEX "Room_typeId_idx" ON "Room"("typeId");

-- CreateIndex
CREATE INDEX "Room_statusId_idx" ON "Room"("statusId");

-- CreateIndex
CREATE INDEX "Room_deletedAt_idx" ON "Room"("deletedAt");

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_cleaningStatusId_fkey" FOREIGN KEY ("cleaningStatusId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
