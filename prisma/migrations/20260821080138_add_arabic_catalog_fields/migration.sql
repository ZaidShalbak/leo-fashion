-- AlterTable
ALTER TABLE "Brand" ADD COLUMN     "descriptionAr" TEXT,
ADD COLUMN     "nameAr" TEXT;

-- AlterTable
ALTER TABLE "Collection" ADD COLUMN     "descriptionAr" TEXT,
ADD COLUMN     "titleAr" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "descriptionAr" TEXT,
ADD COLUMN     "titleAr" TEXT;
