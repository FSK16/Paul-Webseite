function convertToCppJson(results) {
    const stopMap = new Map(); // stopId → { stopid, linesMap }

    results.forEach(departure => {
        const stopId = departure?.StopEvent?.ThisCall?.CallAtStop?.StopPointRef?._text ?? null;
        if (!stopId) return;

        const service = departure?.StopEvent?.Service ?? {};
        const times = departure?.StopEvent?.ThisCall?.CallAtStop?.ServiceDeparture ?? {};

        const scheduled = times?.TimetabledTime?._text ?? null;
        const estimated = times?.EstimatedTime?._text ?? scheduled;

        const lineName = service?.ServiceSection?.PublishedLineName?.Text?._text ?? null;
        const destination = service?.DestinationText?.Text?._text ?? null;

        let stopName = departure?.StopEvent?.ThisCall?.CallAtStop?.StopPointName?.Text?._text ?? '';
        const plattFormName = departure?.StopEvent?.ThisCall?.CallAtStop?.PlannedBay?.Text?._text ?? '';

        const direction = service?.ServiceSection?.DirectionRef?._text ?? '';
        let directionIndex = 1; // Default value
        if (direction !== '' && direction === 'inward') {
            directionIndex = 1;
        } else if (direction !== '' && direction === 'outward') {
            directionIndex = 2;
        }



        if (plattFormName != '') {
            stopName += ' (' + plattFormName + ')';
        }

        const parseTimeToMs = (t) => {
            if (!t) return null;
            const d = new Date(t);
            return isNaN(d.getTime()) ? null : d.getTime();
        };

        const estimatedMs = parseTimeToMs(estimated);
        const countdown = estimatedMs == null
            ? null
            : Math.round((estimatedMs - Date.now()) / 60000);

        // Skip if already departed
        if (countdown !== null && countdown < 0) return;

        const lineNum = parseInt(lineName, 10);
        if (isNaN(lineNum) || lineNum < 1) return;

        // Ensure this stopId exists in stopMap
        if (!stopMap.has(stopId)) {
            stopMap.set(stopId, {
                stopId: stopId,
                stopName: stopName,
                linesMap: new Map()
            });
        }

        let stopEntry = stopMap.get(stopId);

        // Ensure this line exists for this stopId
        if (!stopEntry.linesMap.has(lineName)) {
            stopEntry.linesMap.set(lineName, {
                name: lineName,
                towards: destination,
                richtungsId: "1",
                barrierFree: true,
                departures: {
                    departure: []
                }
            });
        }

        // Add departure
        stopEntry.linesMap.get(lineName).departures.departure.push({
            vehicle: {
                name: lineName,
                towards: destination,
                richtungsId: directionIndex.toString() ? directionIndex.toString() : "1",
            },
            departureTime: {
                timePlanned: scheduled,
                countdown: countdown,
                timeReal: estimated
            }
        });
    });

    // Build final structure
    const monitors = Array.from(stopMap.values()).map(stop => ({
        locationStop: {
            properties: {
                name: stop.stopId, //Sollte eogentlich DIVA Nummer sein
                title: stop.stopName,
                rblString: stop.stopId.split(":").slice(0, 3).join(":"),
            }
        },
        lines: Array.from(stop.linesMap.values())
    }));
    return {
        data: {
            monitors,
            trafficInfos: [],
            trafficInfoCategories: [],
            trafficInfoCategoryGroups: []
        },
        message: {
            messageCode: 1,
            serverTime: new Date().toISOString()
        }
    };
}
module.exports = convertToCppJson;
