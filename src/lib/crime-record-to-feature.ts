// lib/crime-record-to-feature.ts

import type { CrimeFeature, CrimeRecord } from "./types";

export function crimeRecordToFeature(record: CrimeRecord): CrimeFeature {
    return {
        type: "Feature",
        geometry: {
            type: "Point",
            coordinates: [
                record.lon,
                record.lat,
            ],
        },
        properties: {
            category: record.category,
            outcome: record.outcome,
            outcomeKey: record.outcomeKey,
            month: record.month,
            streetName: record.streetName,
            context: record.context,
        },
    };
}
