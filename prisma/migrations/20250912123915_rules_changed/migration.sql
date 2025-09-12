-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_IrregularStation" (
    "stationID" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "stationName" TEXT NOT NULL DEFAULT 'Keine Daten',
    "stopID" INTEGER,
    "lineID" INTEGER,
    "seqNumber" INTEGER,
    "direction" INTEGER,
    "added" BOOLEAN
);
INSERT INTO "new_IrregularStation" ("added", "direction", "lineID", "seqNumber", "stationID", "stationName", "stopID") SELECT "added", "direction", "lineID", "seqNumber", "stationID", "stationName", "stopID" FROM "IrregularStation";
DROP TABLE "IrregularStation";
ALTER TABLE "new_IrregularStation" RENAME TO "IrregularStation";
CREATE UNIQUE INDEX "IrregularStation_stationName_key" ON "IrregularStation"("stationName");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
