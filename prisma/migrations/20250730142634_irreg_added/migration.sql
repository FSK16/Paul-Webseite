-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_IrregularStation" (
    "stationID" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "stationName" TEXT NOT NULL DEFAULT 'Keine Daten',
    "stopID" INTEGER,
    "lineID" INTEGER,
    "added" BOOLEAN,
    CONSTRAINT "IrregularStation_lineID_fkey" FOREIGN KEY ("lineID") REFERENCES "Line" ("lineID") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "IrregularStation_stopID_fkey" FOREIGN KEY ("stopID") REFERENCES "Station" ("stationID") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_IrregularStation" ("added", "lineID", "stationID", "stationName") SELECT "added", "lineID", "stationID", "stationName" FROM "IrregularStation";
DROP TABLE "IrregularStation";
ALTER TABLE "new_IrregularStation" RENAME TO "IrregularStation";
CREATE UNIQUE INDEX "IrregularStation_stationName_key" ON "IrregularStation"("stationName");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
