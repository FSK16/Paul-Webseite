/*
  Warnings:

  - The primary key for the `Station` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Added the required column `id` to the `Station` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_LineStation" (
    "combinationID" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "stationID" INTEGER NOT NULL DEFAULT 99999999999999,
    "lineID" INTEGER NOT NULL DEFAULT 99999999999999,
    "patternID" INTEGER NOT NULL DEFAULT 99999999999999,
    "stopSequenceNumber" INTEGER NOT NULL DEFAULT 99999999999999,
    "direction" INTEGER NOT NULL DEFAULT 99999999999999,
    CONSTRAINT "LineStation_lineID_fkey" FOREIGN KEY ("lineID") REFERENCES "Line" ("lineID") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LineStation_stationID_fkey" FOREIGN KEY ("stationID") REFERENCES "Station" ("stationID") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_LineStation" ("combinationID", "direction", "lineID", "patternID", "stationID", "stopSequenceNumber") SELECT "combinationID", "direction", "lineID", "patternID", "stationID", "stopSequenceNumber" FROM "LineStation";
DROP TABLE "LineStation";
ALTER TABLE "new_LineStation" RENAME TO "LineStation";
CREATE TABLE "new_Station" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "stationID" INTEGER NOT NULL,
    "stationName" TEXT NOT NULL DEFAULT 'Keine Daten',
    "city" TEXT,
    "divaNr" INTEGER NOT NULL DEFAULT 99999999999999,
    "longitude" DECIMAL,
    "latitude" DECIMAL
);
INSERT INTO "new_Station" ("city", "divaNr", "latitude", "longitude", "stationID", "stationName") SELECT "city", "divaNr", "latitude", "longitude", "stationID", "stationName" FROM "Station";
DROP TABLE "Station";
ALTER TABLE "new_Station" RENAME TO "Station";
CREATE UNIQUE INDEX "Station_stationID_key" ON "Station"("stationID");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
