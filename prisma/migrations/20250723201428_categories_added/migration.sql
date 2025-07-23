-- CreateTable
CREATE TABLE "Disruption" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "disruptionText" TEXT NOT NULL DEFAULT 'Keine Daten',
    "disruptionCategoryId" INTEGER,
    CONSTRAINT "Disruption_disruptionCategoryId_fkey" FOREIGN KEY ("disruptionCategoryId") REFERENCES "DisruptionCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DisruptionCategory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "category" TEXT NOT NULL DEFAULT 'Keine Daten',
    "description" TEXT NOT NULL DEFAULT 'Keine Daten',
    "priority" INTEGER NOT NULL DEFAULT 10
);
