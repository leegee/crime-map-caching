// lib/flatten-crime.ts

import type { Crime, CrimeRecord, CrimeOutcome } from "./types";
import { outcomeDescriptionToKey } from "./court-disposals";

export function flattenCrime(crime: Crime): CrimeRecord {
    const outcome = crime.outcome_status?.category ?? "Unknown";

    return {
        id: crime.id,

        lon: Number(crime.location.longitude),
        lat: Number(crime.location.latitude),

        category: crime.category as CrimeRecord["category"],

        outcome,
        outcomeKey:
            (outcomeDescriptionToKey[outcome] as CrimeOutcome)
            ?? "unknown",

        streetName: crime.location.street.name,

        context: crime.context,

        month: crime.month,
    };
}
