/*
  Warnings:

  - A unique constraint covering the columns `[stationName]` on the table `IrregularStation` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "IrregularStation" ADD COLUMN "added" BOOLEAN;
ALTER TABLE "IrregularStation" ADD COLUMN "line" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "IrregularStation_stationName_key" ON "IrregularStation"("stationName");
