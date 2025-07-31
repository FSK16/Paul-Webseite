const express = require("express");

// npm install prisma --save-dev

// Accessing the filesystem
const path = require("path");
const fs = require("fs");
const { parse } = require('csv-parse'); // Für Version 4.x von csv-parse


// npx prisma init --datasource-provider sqlite
const { PrismaClient } = require("@prisma/client");
const { promiseHooks } = require("v8");
const prisma = new PrismaClient();
const cors = require("cors");

// Nicht nutzen! Session stattdessen
// https://www.npmjs.com/package/express-session
// Wird genutzt um sichere Token zu erstellen
// npm install jsonwebtoken
//const jwt = require("jsonwebtoken")

// npm install --save-dev npm-check-updates
// npx npm-check-updates
// npm install

// Server automatisch neu starten lassen:
// npm i -g nodemon
// Zum Starten: nodemon server.js

const port = 8080;
let app = express();

app.use(express.json());
app.use(cors())
app.use(express.static(path.join(__dirname, "/")));

app.get("/search/:name", async function (req, res) {
    let name = req.params["name"];
    const station = await prisma.station.findMany({
        where: {
            stationName: name
        },
        include: {
            stationLine: {
                include: {
                    line: true
                }
            }
        }
    })
    res.send(station);
})

app.get("/search", async function (req, res) {
    console.log("Test");
    const stations = await prisma.line.findMany({
        include: {
            lineStation: {
                select: {
                    stopSequenceNumber: true,
                    direction: true,
                    patternID: true,
                    station: {
                        select: {
                            stationID: true,
                            divaNr: true,
                            stationName: true
                        }
                    },
                    line: {  // Hier `line` explizit einbinden
                        select: {
                            linetype: true,
                            lineID: true,
                        }
                    }
                },
                where: {
                    patternID: { in: [1, 2] }
                },
            }
        },
        orderBy: {
            priority: "asc"
        }
    });

    res.send(stations);
    console.log("Stations fetched successfully");
});
// Stöunrungskategorien
app.get("/disruptions/disruptionCategories", async function (req, res) {
    try {
        const categories = await prisma.disruptionCategory.findMany({
            orderBy: {
                category: "asc"
            }
        });
        res.send(categories);
    } catch (error) {
        console.error("Error fetching disruption categories:", error);
        res.status(500).send("Internal Server Error");
    }
})
app.post("/disruptions/disruptionCategories", async function (req, res) {
    const { category, description } = req.body;
    try {
        const newCategory = await prisma.disruptionCategory.create({
            data: {
                category: category,
                description: description
            }
        });
        res.status(201).send(newCategory);
    } catch (error) {
        console.error("Error creating disruption category:", error);
        res.status(500).send("Internal Server Error");
    }
});
app.delete("/disruptions/disruptionCategories", async function (req, res) {
    const { id } = req.body;
    try {
        await prisma.disruptionCategory.delete({
            where: {
                id: id
            }
        });
        res.status(204).send();
    } catch (error) {
        console.error("Error deleting disruption category:", error);
        res.status(500).send("Internal Server Error");
    }
});
app.patch("/disruptions/disruptionCategories", async function (req, res) {
    const { id, category, description } = req.body;

    try {
        const updatedCategory = await prisma.disruptionCategory.update({
            where: {
                id: id
            },
            data: {
                category: category,
                description: description
            }
        });
        res.send(updatedCategory);
    } catch (error) {
        console.error("Error updating disruption category:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.post("/disruptions", async function (req, res) {
    const { disruptionText, disruptionID, endDate} = req.body;

    try {
        const newDisruption = await prisma.disruption.create({
            data: {
                disruptionText: disruptionText,
                disruptionCategoryId: disruptionID,
                endDate: endDate,
            }
        });
        res.status(201).send(newDisruption);
    } catch (error) {
        console.error("Error creating disruption:", error);
        res.status(500).send("Internal Server Error");
    }
});

async function generatePriorities() {
    const MetroPriority = await prisma.line.updateMany({
        data: {
            priority: 1
        },
        where: {
            linetype: "Metro"
        }
    })

    const TramPriority = await prisma.line.updateMany({
        data: {
            priority: 2
        },
        where: {
            linetype: "Tram"
        }
    })

    const BusAPriority = await prisma.line.updateMany({
        data: {
            priority: 3
        },
        where: {
            linetype: "BusCity",
            lineName: { contains: 'A' }
        }
    })

    const BusBPriority = await prisma.line.updateMany({
        data: {
            priority: 4
        },
        where: {
            linetype: "BusCity",
            lineName: { contains: 'B' }
        }
    })

    const BusNightPriority = await prisma.line.updateMany({
        data: {
            priority: 5
        },
        where: {
            OR: [
                { linetype: "BusNight" },
                { linetype: "TramWLB" }
            ]
        }
    })

    const BusCallPriority = await prisma.line.updateMany({
        data: {
            priority: 6
        },
        where: {
            linetype: "RufBus"
        }
    })


}


async function insertDataofCSVFiles() {
    try {
        var DataSheetStations = path.join(__dirname, "daten", "stops.csv");
        var DataSheetLines = path.join(__dirname, "daten", "line.csv");
        let inserts = 0;
        let stations = [];
        fs.createReadStream(DataSheetStations)
            .pipe(
                parse({
                    delimiter: ";",
                    from_line: 2,
                    relax_column_count: true,
                })
            )
            .on("data", async function (row) {
                let stationID = parseInt(row[0]);
                let rblNr = parseInt(row[1]);
                let stationName = row[2];
                let city = row[3];
                let longitude = parseFloat(row[5]);
                let latitude = parseFloat(row[6]);

                if (Number.isNaN(rblNr)) {
                    rblNr = 999999999;
                }

                if (Number.isNaN(latitude)) {
                    latitude = 999999999;
                }

                if (Number.isNaN(longitude)) {
                    longitude = 999999999;
                }

                let station = {
                    stationID: stationID,
                    divaNr: rblNr,
                    city: city,
                    stationName: stationName,
                    latitude: latitude,
                    longitude: longitude
                }
                stations.push(station);
            }).on("end", async function () {
                try {
                    // Alle Stationsdaten in die Datenbank speichern
                    const newstations = await prisma.station.createMany({
                        data: stations,
                    });
                    console.log(`${newstations.count} Stations have been added to the database.`);
                } catch (error) {
                    console.error("Error inserting data into the database:", error);
                }
            });

        let lines = [];

        fs.createReadStream(DataSheetLines)
            .pipe(
                parse({
                    delimiter: ";",
                    from_line: 2,
                    relax_column_count: true,
                })
            )
            .on("data", async function (row) {
                let lineId = parseInt(row[0]);
                let lineName = row[1];
                let sortingHelp = parseInt(row[2]);
                let realtime = parseInt(row[3]);
                let meansOfTransport = row[4];

                if (Number.isNaN(sortingHelp)) {
                    sortingHelp = 999999999;
                }

                if (Number.isNaN(realtime)) {
                    realtime = 999999999;
                }

                if (meansOfTransport === undefined) {
                    meansOfTransport = "unbekannt";
                }


                let meansOfTransportFormatted = meansOfTransport.split("pt");
                meansOfTransportFormatted = meansOfTransportFormatted[1];

                let line = {
                    lineID: lineId,
                    lineName: lineName,
                    sortingHelp: sortingHelp,
                    realtime: realtime,
                    linetype: meansOfTransportFormatted

                }

                lines.push(line);


            })
            .on("end", async function () {
                try {
                    // Alle Stationsdaten in die Datenbank speichern
                    const newLines = await prisma.line.createMany({
                        data: lines,
                    });
                    console.log(`${newLines.count} Lines have been added to the database.`);
                } catch (error) {
                    console.error("Error inserting data into the database:", error);
                }
            });;


    } catch (error) {
        console.log(error);
    }
}

async function getLastStationofLines() {

    const connectionsLastStop = await prisma.lineStation.findMany({
        distinct: ['patternID', 'lineID'],
        orderBy: {
            stopSequenceNumber: 'desc'
        },
        include: {
            station: true
        }
    })
    if (!Array.isArray(connectionsLastStop)) {
        console.log("Kein Array!");
    }

    for (const entry of connectionsLastStop) {
        console.log(entry);
        let lastStationName = entry.station.stationName;
        let lineID = entry.lineID;
        let patternID = entry.patternID;

        let lastStationAdded = await prisma.lineStation.updateMany({
            data: {
                directionTo: lastStationName
            },
            where: {
                lineID: lineID,
                patternID: patternID
            }
        });
        console.log(lastStationAdded);
    }

}

async function insertCombos() {

    var DataSheetCombinations = path.join(__dirname, "daten", "lineStation.csv");
    let inserts = 0;
    let combos = [];
    let errors = 0;
    console.log("Funktion wird aufgerufen");

    fs.createReadStream(DataSheetCombinations)
        .pipe(
            parse({
                delimiter: ";",
                from_line: 2,
                relax_column_count: true,
            })
        )
        .on("data", async function (row) {
            let lineId = parseInt(row[0]);
            let patternID = parseInt(row[1]);
            let stopSecCount = parseInt(row[2]);
            let stationID = parseInt(row[3]);
            let direction = parseInt(row[4]);

            if (Number.isNaN(patternID)) {
                patternID = 999999999;
            }

            if (Number.isNaN(stopSecCount)) {
                stopSecCount = 999999999;
            }

            if (Number.isNaN(direction)) {
                direction = 999999999;
            }

            if (!Number.isNaN(stationID)) {


                let stationIdInDB = await prisma.station.findUnique({
                    where: {
                        stationID: stationID
                    }
                })
                const newlineIdinDB = await prisma.line.findUnique({
                    where: {
                        lineID: lineId
                    },
                    select: {
                        lineID: true
                    }
                })
                if (newlineIdinDB) {
                    let lineIdinDB = newlineIdinDB.lineID
                    if (lineIdinDB !== null && stationIdInDB !== null) {
                        combo = {
                            lineID: lineId,
                            patternID: patternID,
                            stopSequenceNumber: stopSecCount,
                            direction: direction,
                            stationID: stationID,
                        }
                        combos.push(combo);
                    }
                    else {
                        errors = errors + 1;
                    }
                }


            }

        })
        .on("end", async function () {
            try {
                //Warte bis wirklich alle Stationen ausgelesen wurden!!
                setTimeout(async function () {
                    console.log(combos);
                    const newCombos = await prisma.lineStation.createMany({
                        data: combos,
                    });
                    console.log(`${newCombos.count} Combos have been added to the database.`);
                }, 5000)

            } catch (error) {
                console.error("Error inserting data into the database:", error);
            }
            console.log("Errors beim Integrieren der Daten:" + errors);

        });

}

async function addIreggularStationCombos(){
    const irregStations = await prisma.irregularStation.findMany({
        where:{
            added: false
        }
    });
    console.log(irregStations);
    irregStations.forEach(async (station) => {
        let newCombos = await prisma.lineStation.create({
            data: {
                lineID: station.lineID,
                patternID: station.direction, // Beispielwert, anpassen je nach Bedarf
                stopSequenceNumber: station.seqNumber, // Beispielwert, anpassen je nach Bedarf
                direction: station.direction, // Beispielwert, anpassen je nach Bedarf
                stationID: station.stopID,
            }
        });
        newCombos = await prisma.irregularStation.update({
            data: {
                added: true
            },
            where: {
                stationID: station.stationID
            },
        });
        console.log(newCombos);
        console.log(`Added irregular station combo for ${station.stationName}`);
    });

}

async function insertIrregularStations() {
    const irregularStations = await prisma.irregularStation.createMany({
        data: [
            /*{ stationName: "Spengergasse" },
            { stationName: "Siebenbrunnengasse" },
            { stationName: "Bacherplatz" },*/
        ]
    })
    console.log(`${irregularStations.count} Irregular Stations have been added to the database.`);
}


app.get('/', (req, res) => {
    res.redirect("echt.html");
});

app.get('/newpriority', (req, res) => {
    generatePriorities();
})
app.get('/config', (req, res) => {
    res.sendFile(path.join(__dirname, 'echt.html'));
});

app.listen(port, "0.0.0.0", async function () {

    //addIreggularStationCombos();
    //insertIrregularStations();
    /*
    generatePriorities();
    
    await prisma.lineStation.deleteMany();
    await prisma.line.deleteMany();
    await prisma.station.deleteMany();

    // Warte auf das Einfügen von Daten und führe dann die Combo-Funktion aus
    await insertDataofCSVFiles();  // Warten, bis das Einfügen der Daten abgeschlossen ist
    
    await insertCombos();*/

    //etzt rufst du  auf, nachdem insertDataofCSVFiles() abgeschlossen ist

    console.log("Server is running on http://localhost:" + port);
    //await getLastStationofLines();
});

app.get("/test/", async function () {
    insertCombos();
})



function Sleep(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}
