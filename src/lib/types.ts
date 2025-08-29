import type { GeoJsonProperties, Point, FeatureCollection, Feature } from "geojson";
import { crimeCategories } from "./categories";

export const CRIME_CATEGORIES = Object.keys(crimeCategories) as Array<keyof typeof crimeCategories>;
export type CrimeCategory = typeof CRIME_CATEGORIES[number];

export type Crime = {
    id: string;
    category: string;
    outcome_status?: { category: string };
    location: { latitude: string; longitude: string };
    month: string;
};

export type CrimeFeature = Feature<Point, GeoJsonProperties>;

export type CrimeFeatureCollection = FeatureCollection<Point, GeoJsonProperties>;