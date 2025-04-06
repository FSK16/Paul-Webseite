-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Line" (
    "lineID" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "lineName" TEXT NOT NULL DEFAULT 'Keine Daten',
    "sortingHelp" INTEGER NOT NULL DEFAULT 99999999999999,
    "realtime" INTEGER NOT NULL DEFAULT 99999999999999,
    "linetype" TEXT NOT NULL DEFAULT 'Keine Daten',
    "priority" INTEGER NOT NULL DEFAULT 10
);
INSERT INTO "new_Line" ("lineID", "lineName", "linetype", "realtime", "sortingHelp") SELECT "lineID", "lineName", "linetype", "realtime", "sortingHelp" FROM "Line";
DROP TABLE "Line";
ALTER TABLE "new_Line" RENAME TO "Line";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
