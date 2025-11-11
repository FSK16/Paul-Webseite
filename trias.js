import express from 'express';
import xmlRequest from './xml.js';

const app = express();
const port = 3002;
app.use(express.json());

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

app.get('/departures', async (req, res) => {
    const stationId = req.query.stationId ? req.query.stationId : 'at:46:4046';
    const url = req.query.url ? req.query.url : 'http://ogdtrias.verbundlinie.at:8183/stv/trias';
    const currentTime = new Date().toISOString();
    let departures = [];
    const xml =
        `<?xml version="1.0" encoding="UTF-8"?>
        <Trias xmlns="http://www.vdv.de/trias" xmlns:siri="http://www.siri.org.uk/siri" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" version="1.2">
        <ServiceRequest>
            <siri:RequestTimestamp>${currentTime}</siri:RequestTimestamp>
            <siri:RequestorRef></siri:RequestorRef>
            <RequestPayload>
                <StopEventRequest>
                    <Location>
                        <LocationRef>
                            <StopPointRef>${stationId}</StopPointRef>
                        </LocationRef>
                    </Location>
                    <Params>
                        <IncludeRealtimeData>true</IncludeRealtimeData>
                    </Params>
                </StopEventRequest>
            </RequestPayload>
        </ServiceRequest>
    </Trias>`;

    try {
        const departuresData = await xmlRequest(url, xml);
        if (departuresData.statusCode !== 200) {
            res.status(departuresData.statusCode).send(departuresData.parseError ? departuresData.parseError : `Unexpected status code ${departuresData.statusCode}`);
            console.error(`Error Code 001: Received status code ${departuresData.statusCode}`);
        } else {
            //res.send(departuresData);
            departuresData.json.Trias.ServiceDelivery.DeliveryPayload.StopEventResponse.StopEventResult.forEach(departure => {
                let service = departure.StopEvent.Service;
                let times = departure.StopEvent.ThisCall.CallAtStop.ServiceDeparture;

                let scheduledDepartureTime = times.TimetabledTime._text;
                let estimatedDepartureTime = times.EstimatedTime._text ? times.EstimatedTime._text : scheduledDepartureTime;
                let lineName = service.ServiceSection.PublishedLineName.Text._text;

                const departureEntry = {
                    originStopID: service.OriginStopPointRef._text,
                    originName: service.OriginText.Text._text,
                    lineName: lineName,
                    destinationStopID: service.DestinationStopPointRef._text,
                    destinationName: service.DestinationText.Text._text,
                    scheduledDepartureTime: scheduledDepartureTime,
                    expectedDepartureTime: estimatedDepartureTime,
                    timeDifferenceMin: (() => {
                                       const ms = (() => {
                            const d = new Date(estimatedDepartureTime);
                            return isNaN(d.getTime()) ? null : d.getTime() - Date.now();
                        })();
                        return ms === null ? null : Math.round(ms / 60000);
                    })(),
                    ptMode: service.ServiceSection.Mode.PtMode._text
                };
                if(Number(departureEntry.timeDifferenceMin) >= 0)
                    departures.push(departureEntry);
            });
            res.status(200).send(departures.sort((a, b) => a.expectedDepartureTime - b.expectedDepartureTime));
        }
    } catch (error) {
        res.status(500).send(`Error Code 004: ${error.message}`);
    }
});

app.listen(port, () => {
    console.log(`Trias Client listening at http://localhost:${port}`);
});
