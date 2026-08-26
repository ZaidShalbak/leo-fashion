-- AlterTable
ALTER TABLE "Address" ALTER COLUMN "postalCode" DROP NOT NULL,
ALTER COLUMN "country" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "shippingPostalCode" DROP NOT NULL,
ALTER COLUMN "shippingCountry" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "phone" TEXT;
