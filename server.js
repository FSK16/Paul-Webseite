
// npm install prisma --save-dev
const xmlRequest = require('./xml.js');
const convertToCppJson = require('./dienstagpresentation.js');

// Accessing the filesystem
const express = require("express");
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
    const { disruptionText, disruptionCategoryId, endDate } = req.body;

    if (disruptionCategoryId === 0) {
        disruptionCategoryId = null;
    }

    console.log("Received disruption data:", req.body);

    try {
        const newDisruption = await prisma.disruption.create({
            data: {
                disruptionText: disruptionText,
                disruptionCategoryId: disruptionCategoryId,
                endDate: endDate,
            }
        });
        res.status(201).send(newDisruption);
    } catch (error) {
        console.error("Error creating disruption:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.get("/disruptions", async function (req, res) {
    try {
        const disruptions = await prisma.disruption.findMany({
            where: {
                OR: [
                    { endDate: null },
                    { endDate: { gt: new Date() } }
                ]
            }
        });
        res.send(disruptions);
    } catch (error) {
        console.error("Error fetching disruptions:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.patch("/disruptions", async function (req, res) {
    const { id, disruptionText, disruptionCategoryId, endDate } = req.body;

    if (disruptionCategoryId === 0) {
        disruptionCategoryId = null;
    }

    try {
        const updatedDisruption = await prisma.disruption.update({
            where: {
                id: id
            },
            data: {
                disruptionText: disruptionText,
                disruptionCategoryId: disruptionCategoryId,
                endDate: endDate
            }
        });
        res.send(updatedDisruption);
    } catch (error) {
        console.error("Error updating disruption:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.delete("/disruptions", async function (req, res) {
    const { id } = req.body;
    try {
        await prisma.disruption.delete({
            where: {
                id: id
            }
        });
        res.status(204).send();
    } catch (error) {
        console.error("Error deleting disruption:", error);
        res.status(500).send("Internal Server Error");
    }
});



app.get('/stationinfo', async (req, res) => {
    const stationName = req.query.stationName ? req.query.stationName : 'Graz Jakominiplatz';
    const url = req.query.url ? req.query.url : 'http://ogdtrias.verbundlinie.at:8183/stv/trias';
    const currentTime = new Date().toISOString();
    const xml =
        `<?xml version="1.0" encoding="UTF-8"?>
        <Trias xmlns="http://www.vdv.de/trias" xmlns:siri="http://www.siri.org.uk/siri" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" version="1.2">
        <ServiceRequest>
            <siri:RequestTimestamp>${currentTime}</siri:RequestTimestamp>
            <siri:RequestorRef></siri:RequestorRef>
            <RequestPayload>
                <LocationInformationRequest>
                    <InitialInput>
                        <LocationName>${stationName}</LocationName>
                    </InitialInput>
                </LocationInformationRequest>
            </RequestPayload>
        </ServiceRequest>
        </Trias>`;
    try {
        const stationData = await xmlRequest(url, xml);
        if (stationData.statusCode !== 200) {
            res.status(stationData.statusCode).send(stationData.parseError ? stationData.parseError : `Unexpected status code ${stationData.statusCode}`);
            console.error(`Error Code 001: Received status code ${stationData.statusCode}`);
        } else {
            const usefulData = {
                stopId: stationData.json.Trias.ServiceDelivery.DeliveryPayload.LocationInformationResponse.LocationResult[0].Location.StopPoint.StopPointRef._text,
                stopName: stationData.json.Trias.ServiceDelivery.DeliveryPayload.LocationInformationResponse.LocationResult[0].Location.StopPoint.StopPointName._text,
                coordinates: {
                    lat: stationData.json.Trias.ServiceDelivery.DeliveryPayload.LocationInformationResponse.LocationResult[0].Location.GeoPosition.Latitude._text,
                    lon: stationData.json.Trias.ServiceDelivery.DeliveryPayload.LocationInformationResponse.LocationResult[0].Location.GeoPosition.Longitude._text
                }
            }
            res.status(200).send(usefulData);
        }
    } catch (error) {
        res.status(500).send(`Error Code 004: ${error.message}`);
    }
});

app.get('/departuresDienstag', async (req, res) => {
    const stationId = req.query.stationId ? req.query.stationId : 'at:46:4044';
    //const url = req.url ? req.query.url : 'http://ogdtrias.verbundlinie.at:8183/stv/trias';
    const url = req.query.url ? req.query.url : 'http://ogdtrias.verbundlinie.at:8183/stv/trias';
    const currentTime = new Date().toISOString();
    let departures = [];
    const stationIds = stationId.split(',').map(id => id.trim());
    let stationRequest = '';

    stationIds.forEach(id => {
        stationRequest += `                
        <StopEventRequest>
            <Location>
                <LocationRef>
                    <StopPointRef>${id}</StopPointRef>
                </LocationRef>
            </Location>
            <Params>
                <IncludeRealtimeData>true</IncludeRealtimeData>
            </Params>
        </StopEventRequest>`;
    });
    const xml =
        `<?xml version="1.0" encoding="UTF-8"?>
        <Trias xmlns="http://www.vdv.de/trias" xmlns:siri="http://www.siri.org.uk/siri" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" version="1.2">
        <ServiceRequest>
            <siri:RequestTimestamp>${currentTime}</siri:RequestTimestamp>
            <siri:RequestorRef></siri:RequestorRef>
            <RequestPayload>
                ${stationRequest}
            </RequestPayload>
        </ServiceRequest>
    </Trias>`;

    console.log("XML-Request URL: ", xml);

    try {
        const departuresData = await xmlRequest(url, xml);
        if (departuresData.statusCode !== 200) {
            res.status(departuresData.statusCode).send(departuresData.parseError ? departuresData.parseError : `Unexpected status code ${departuresData.statusCode}`);
            console.error(`Error Code 001: Received status code ${departuresData.statusCode}`);

        } else {
            //res.send(departuresData);
            const results = departuresData.json?.Trias?.ServiceDelivery?.DeliveryPayload?.StopEventResponse?.StopEventResult;
            let lineEntry = {};

            if (Array.isArray(results)) {
                const cppJson = convertToCppJson(results);
                res.status(200).send(cppJson);
            }

            // Sort by expectedDepartureTime (parsed). Missing times go to the end.
            departures.sort((a, b) => {
                const ta = a.expectedDepartureTime ? new Date(a.expectedDepartureTime).getTime() : Number.POSITIVE_INFINITY;
                const tb = b.expectedDepartureTime ? new Date(b.expectedDepartureTime).getTime() : Number.POSITIVE_INFINITY;
                return ta - tb;
            });

            departures = convertDepartures({ departures: departures });




            
            
            monitorsEntry = [];

            let responseObject = {
                data: {
                    monitors: departures
                },
                status: {
                    statusCode: 1,
                    statusMessage: "Success",
                }
            };

            res.status(200).send(responseObject);
        }
    } catch (error) {
        res.status(500).send(`Error Code 004: ${error.message}`);
    }

});
app.post('/departures', async (req, res) => {
    const stationId = req.body.stationId ? req.body.stationId : 'at:46:4044,at:46:4045';
    //const url = req.url ? req.query.url : 'http://ogdtrias.verbundlinie.at:8183/stv/trias';
    const url = req.body.url ? req.body.url : 'http://ogdtrias.verbundlinie.at:8183/stv/trias';
    const currentTime = new Date().toISOString();
    let departures = [];
    const stationIds = stationId.split(',').map(id => id.trim());
    let stationRequest = '';

    stationIds.forEach(id => {
        stationRequest += `                
        <StopEventRequest>
            <Location>
                <LocationRef>
                    <StopPointRef>${id}</StopPointRef>
                </LocationRef>
            </Location>
            <Params>
                <IncludeRealtimeData>true</IncludeRealtimeData>
            </Params>
        </StopEventRequest>`;
    });
    const xml =
        `<?xml version="1.0" encoding="UTF-8"?>
        <Trias xmlns="http://www.vdv.de/trias" xmlns:siri="http://www.siri.org.uk/siri" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" version="1.2">
        <ServiceRequest>
            <siri:RequestTimestamp>${currentTime}</siri:RequestTimestamp>
            <siri:RequestorRef></siri:RequestorRef>
            <RequestPayload>
                ${stationRequest}
            </RequestPayload>
        </ServiceRequest>
    </Trias>`;

    console.log("XML-Request URL: ", xml);

    try {
        const departuresData = await xmlRequest(url, xml);
        if (departuresData.statusCode !== 200) {
            res.status(departuresData.statusCode).send(departuresData.parseError ? departuresData.parseError : `Unexpected status code ${departuresData.statusCode}`);
            console.error(`Error Code 001: Received status code ${departuresData.statusCode}`);

        } else {
            //res.send(departuresData);
            const results = departuresData.json?.Trias?.ServiceDelivery?.DeliveryPayload?.StopEventResponse?.StopEventResult;
            if (Array.isArray(results)) {
                results.forEach(departure => {
                    const service = departure?.StopEvent?.Service ?? {};
                    const times = departure?.StopEvent?.ThisCall?.CallAtStop?.ServiceDeparture ?? {};

                    const scheduledDepartureTime = times?.TimetabledTime?._text ?? null;
                    const estimatedDepartureTime = times?.EstimatedTime?._text ?? scheduledDepartureTime;
                    const lineName = service?.ServiceSection?.PublishedLineName?.Text?._text ?? null;

                    const parseTimeToMs = (t) => {
                        if (!t) return null;
                        const d = new Date(t);
                        return isNaN(d.getTime()) ? null : d.getTime();
                    };

                    const estimatedMs = parseTimeToMs(estimatedDepartureTime);
                    const timeDifferenceMin = estimatedMs === null ? null : Math.round((estimatedMs - Date.now()) / 60000);

                    //Kommentare aufgrund Kotlinserver
                    const departureEntry = {
                        tripId: departure.ResultId?._text ?? null,
                        //originStopID: service?.OriginStopPointRef?._text ?? null,
                        //originName: service?.OriginText?.Text?._text ?? null,
                        line: lineName,
                        //destinationStopID: service?.DestinationStopPointRef?._text ?? null,
                        destinationName: service?.DestinationText?.Text?._text ?? null,
                        scheduledDepartureTime: scheduledDepartureTime,
                        expectedDepartureTime: estimatedDepartureTime ?? null,
                        countdown: Number(timeDifferenceMin),
                        //ptMode: service?.ServiceSection?.Mode?.PtMode?._text ?? null,
                        travelMode: service?.ServiceSection?.Mode?.PtMode?._text ?? null,
                    };

                    // Preserve original behaviour: include entries when timeDifferenceMin is null or non-negative
                    if (timeDifferenceMin === null || Number(timeDifferenceMin) >= 0) {
                        departures.push(departureEntry);
                    }
                });
            }

            // Sort by expectedDepartureTime (parsed). Missing times go to the end.
            departures.sort((a, b) => {
                const ta = a.expectedDepartureTime ? new Date(a.expectedDepartureTime).getTime() : Number.POSITIVE_INFINITY;
                const tb = b.expectedDepartureTime ? new Date(b.expectedDepartureTime).getTime() : Number.POSITIVE_INFINITY;
                return ta - tb;
            });

            departures = convertDepartures({ departures: departures });





            let responseObject = {
                data: departures,
                status: {
                    statusCode: 1,
                    statusMessage: "Success",
                }
            };

            res.status(200).send(responseObject);
        }
    } catch (error) {
        res.status(500).send(`Error Code 004: ${error.message}`);
    }
});

function convertDepartures(oldData) {
    const grouped = {};

    oldData.departures.forEach(dep => {
        if (!grouped[dep.line]) {
            grouped[dep.line] = {
                lineName: dep.line,
                depatures: [],
                infoText: null
            };
        }

        grouped[dep.line].depatures.push({
            line: dep.line,
            destination: dep.destinationName,
            countdown: dep.countdown,
            infoText: null // kein equivalent im alten Format
        });
    });

    return {
        lines: Object.values(grouped)
    };
}


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

                if (!lines.some(l => l.lineID === lineId)) {
                    lines.push(line);
                }


            })
            .on("end", async function () {
                try {
                    console.log(lines);
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
async function setFalseIrregularStationCombos() {
    const irregStations = await prisma.irregularStation.findMany({
        where: {
            added: true
        }
    });
    irregStations.forEach(async (station) => {
        newCombos = await prisma.irregularStation.update({
            data: {
                added: false
            },
            where: {
                stationID: station.stationID
            },
        });
    });
}
async function addIreggularStationCombos() {
    const irregStations = await prisma.irregularStation.findMany({
        where: {
            added: false
        }
    });
    irregStations.forEach(async (station) => {
        await prisma.lineStation.create({
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
        console.log(`Added irregular station combo for ${station.stationName}`);
    });

}

async function insertIrregularStations(data) {
    const irregularStations = await prisma.irregularStation.createMany({
        data: data
    })
    console.log(`${irregularStations.count} Irregular Stations have been added to the database.`);
}

async function getIrregularStations() {
    return await prisma.irregularStation.findMany()
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
    /*
    Schritt 1:
*/
    //addIreggularStationCombos();
    //insertIrregularStations();

    /*
    await prisma.line.deleteMany();
    await prisma.lineStation.deleteMany();

    await prisma.station.deleteMany();

    // Warte auf das Einfügen von Daten und führe dann die Combo-Funktion aus
    await insertDataofCSVFiles();  // Warten, bis das Einfügen der Daten abgeschlossen ist
    
    await insertCombos();

    await generatePriorities();
    //Jetzt rufst du  auf, nachdem insertDataofCSVFiles() abgeschlossen ist

      /*  
    Schritt 2:*/
    //await generatePriorities();
    /*
        Schritt 3:*/
    /* await prisma.lineStation.deleteMany();

     await insertCombos();
     await getLastStationofLines();

    /*
    Schritt 4: *//*
        await setFalseIrregularStationCombos();
    /*
    Schritt 5: *//*
 /*
 Schritt 4: */
    /*await setFalseIrregularStationCombos();
/*
Schritt 5: *//*
    await addIreggularStationCombos();/**/

    console.log("Server is running on http://localhost:" + port);
    //await getLastStationofLines();
});

app.get("/test/", async function () {
    insertCombos();
})



function Sleep(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}
