-- AlterTable
ALTER TABLE "delivery_partners" ADD COLUMN     "completedOrders" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalEarnings" DOUBLE PRECISION NOT NULL DEFAULT 0;
