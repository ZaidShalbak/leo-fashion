-- CreateEnum
CREATE TYPE "SaleScope" AS ENUM ('SITE_WIDE', 'COLLECTION', 'BRAND');

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "compareAtPriceCentsSnapshot" INTEGER;

-- CreateTable
CREATE TABLE "Sale" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "scope" "SaleScope" NOT NULL,
    "percentOff" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "collectionId" TEXT,
    "brandId" TEXT,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Sale_isActive_idx" ON "Sale"("isActive");

-- CreateIndex
CREATE INDEX "Sale_collectionId_idx" ON "Sale"("collectionId");

-- CreateIndex
CREATE INDEX "Sale_brandId_idx" ON "Sale"("brandId");

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
