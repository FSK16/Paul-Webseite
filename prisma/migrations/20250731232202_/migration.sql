-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Disruption" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "disruptionText" TEXT DEFAULT 'Keine Daten',
    "endDate" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "disruptionCategoryId" INTEGER,
    CONSTRAINT "Disruption_disruptionCategoryId_fkey" FOREIGN KEY ("disruptionCategoryId") REFERENCES "DisruptionCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Disruption" ("disruptionCategoryId", "disruptionText", "id") SELECT "disruptionCategoryId", "disruptionText", "id" FROM "Disruption";
DROP TABLE "Disruption";
ALTER TABLE "new_Disruption" RENAME TO "Disruption";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
