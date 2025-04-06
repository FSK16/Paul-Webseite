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

const port = 3000;
let app = express();

app.use(express.json());
app.use(cors())

app.get("/search/:name", async function (req, res) {
    let name = req.params["name"];
    const station = await prisma.station.findMany({
        where:{
            stationName: name
        },
        include:{
            stationLine:{
                include:{
                    line:true
                }
            }
        }
    })
    res.send(station);
})

app.get("/search", async function (req, res) {
    const stations = await prisma.line.findMany({
        include: {
            lineStation: {
                select: {
                    stopSequenceNumber: true,
                    direction: true,
                    patternID: true,
                    station: {
                        select: {
                            id: true,
                            divaNr: true,
                            stationName: true
                        }
                    },
                    line: {  // Hier `line` explizit einbinden
                        select: {
                            linetype: true
                        }
                    }
                },
                where: {
                    patternID: { in: [1, 2] }
                },
            }
        },
        orderBy:{
            priority: "asc"
        }
    });
    
    res.send(stations);
});

async function generatePriorities() {
    const MetroPriority = await prisma.line.updateMany({
        data:{
            priority: 1
        },
        where:{
            linetype: "Metro"
        }
    })

    const TramPriority = await prisma.line.updateMany({
        data:{
            priority: 2
        },
        where:{
            linetype: "Tram"
        }
    })

    const BusPriority = await prisma.line.updateMany({
        data:{
            priority: 3
        },
        where:{
            linetype: "BusCity"
        }
    })

    const BusNightPriority = await prisma.line.updateMany({
        data:{
            priority: 4
        },
        where:{
            linetype: "BusNight"
        }
    })

    const BusCallPriority = await prisma.line.updateMany({
        data:{
            priority: 5
        },
        where:{
            linetype: "RufBus"
        }
    })
    
    
}


async function insertDataofCSVFiles(){
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

            if(meansOfTransport === undefined){
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
    if(!Array.isArray(connectionsLastStop)){
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

async function insertCombos(){

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
                where:{
                    stationID: stationID
                }
            })
            //console.log(stationIdInDB);

            let lineIdinDB = await prisma.line.findUnique({
                where:{
                    lineID: lineId
                }
            })


            if(stationIdInDB !== null && lineIdinDB !== null){
                combo = {
                    lineID: lineId,
                    patternID: patternID,
                    stopSequenceNumber: stopSecCount,
                    direction: direction,
                    stationID: stationID,
                }
                combos.push(combo);
            }
            else{
                errors = errors + 1;
            }

          
        }
    })
    .on("end", async function () {
        try {
            // Alle Stationsdaten in die Datenbank speichern
            const newCombos = await prisma.lineStation.createMany({
              data: combos,
            });
            console.log(`${newCombos.count} Combos have been added to the database.`);
          } catch (error) {
            console.error("Error inserting data into the database:", error);
          }       
          console.log(errors);

    });

}


app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname));
});

app.listen(port, async function () {


    //generatePriorities();
    /*
    await prisma.lineStation.deleteMany();
    await prisma.line.deleteMany();
    await prisma.station.deleteMany();

    // Warte auf das Einfügen von Daten und führe dann die Combo-Funktion aus
    await insertDataofCSVFiles();  // Warten, bis das Einfügen der Daten abgeschlossen ist

    // Jetzt rufst du insertCombos() auf, nachdem insertDataofCSVFiles() abgeschlossen ist*/

    console.log("Server is running on http://localhost:3000");
    //getLastStationofLines();
});

app.get("/test/", async function () {
    insertCombos();
})

function Sleep(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
    }
    