-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_standaloneStation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "stationID" TEXT NOT NULL,
    "stationName" TEXT NOT NULL DEFAULT 'Keine Daten',
    "city" TEXT,
    "strabaArea" TEXT,
    "lines" TEXT,
    "longitude" DECIMAL,
    "latitude" DECIMAL
);
INSERT INTO "new_standaloneStation" ("city", "id", "latitude", "lines", "longitude", "stationID", "stationName") SELECT "city", "id", "latitude", "lines", "longitude", "stationID", "stationName" FROM "standaloneStation";
DROP TABLE "standaloneStation";
ALTER TABLE "new_standaloneStation" RENAME TO "standaloneStation";
CREATE UNIQUE INDEX "standaloneStation_stationID_key" ON "standaloneStation"("stationID");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
