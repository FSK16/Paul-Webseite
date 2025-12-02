-- CreateTable
CREATE TABLE "standaloneStation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "stationID" INTEGER NOT NULL,
    "stationName" TEXT NOT NULL DEFAULT 'Keine Daten',
    "city" TEXT,
    "lines" TEXT,
    "longitude" DECIMAL,
    "latitude" DECIMAL
);

-- CreateIndex
CREATE UNIQUE INDEX "standaloneStation_stationID_key" ON "standaloneStation"("stationID");
