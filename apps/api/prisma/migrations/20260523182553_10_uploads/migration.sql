-- CreateEnum
CREATE TYPE "UploadKind" AS ENUM ('ROOM_IMAGE', 'GUEST_DOC', 'STAFF_AVATAR', 'OTHER');

-- CreateTable
CREATE TABLE "Upload" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "kind" "UploadKind" NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL DEFAULT 0,
    "mimeType" TEXT NOT NULL DEFAULT 'application/octet-stream',
    "url" TEXT NOT NULL,
    "fileId" TEXT,
    "note" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Upload_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Upload_code_key" ON "Upload"("code");

-- CreateIndex
CREATE INDEX "Upload_kind_idx" ON "Upload"("kind");

-- CreateIndex
CREATE INDEX "Upload_entityType_entityId_idx" ON "Upload"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "Upload_uploadedById_idx" ON "Upload"("uploadedById");

-- CreateIndex
CREATE INDEX "Upload_deletedAt_idx" ON "Upload"("deletedAt");

-- AddForeignKey
ALTER TABLE "Upload" ADD CONSTRAINT "Upload_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
