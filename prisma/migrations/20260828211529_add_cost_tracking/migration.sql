-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "costCentsSnapshot" INTEGER;

-- AlterTable
ALTER TABLE "ProductVariant" ADD COLUMN     "costCents" INTEGER;
