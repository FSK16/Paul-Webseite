function convertToCppJson(results) {
    const linesMap = new Map(); 

    results.forEach(departure => {
        const service = departure?.StopEvent?.Service ?? {};
        const times = departure?.StopEvent?.ThisCall?.CallAtStop?.ServiceDeparture ?? {};

        const scheduled = times?.TimetabledTime?._text ?? null;
        const estimated = times?.EstimatedTime?._text ?? scheduled;

        const lineName = service?.ServiceSection?.PublishedLineName?.Text?._text ?? null;
        const destination = service?.DestinationText?.Text?._text ?? null;

        const parseTimeToMs = (t) => {
            if (!t) return null;
            const d = new Date(t);
            return isNaN(d.getTime()) ? null : d.getTime();
        };

        const estimatedMs = parseTimeToMs(estimated);
        const countdown = estimatedMs == null
            ? null
            : Math.round((estimatedMs - Date.now()) / 60000);

        // Skip if it's in the past
        if (countdown !== null && countdown < 0) return;

        if (!linesMap.has(lineName)) {
            linesMap.set(lineName, {
                name: lineName,
                towards: destination,
                richtungsId: "1",
                barrierFree: true,
                departures: {
                    departure: []
                }
            });
        }

        // push departure
        linesMap.get(lineName).departures.departure.push({
            vehicle: {
                name: lineName,
                towards: destination,
                richtungsId: "1"
            },
            departureTime: {
                countdown: countdown
            }
        });
    });

    // Build final structure
    return {
        data: {
            monitors: [
                {
                    lines: Array.from(linesMap.values())
                }
            ]
        }
    };
}

module.exports =  convertToCppJson;// dienstagpresentation.js
