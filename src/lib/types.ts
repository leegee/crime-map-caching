import type { GeoJsonProperties, Point, FeatureCollection, Feature } from "geojson";

import { crimeCategories } from "./categories";
import { courtDisposals } from "./court-disposals";

export const CRIME_CATEGORIES = Object.keys(crimeCategories) as Array<keyof typeof crimeCategories>;
export type CrimeCategory = typeof CRIME_CATEGORIES[number];

export const CRIME_OUTCOMES = Object.keys(courtDisposals) as Array<keyof typeof courtDisposals>;
export type CrimeOutcome = typeof CRIME_OUTCOMES[number];

export type Crime = {
    id: string;
    category: string;
    outcome_status?: { category: string };
    location: {
        latitude: string;
        longitude: string;
        street: {
            name: string;
            id: number;
        };
    };
    context: string;
    month: string;
};

export type CrimeFeature = Feature<Point, GeoJsonProperties>;

export type CrimeFeatureCollection = FeatureCollection<Point, GeoJsonProperties>;