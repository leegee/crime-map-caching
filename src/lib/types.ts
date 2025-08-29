import type { GeoJsonProperties, Point, FeatureCollection, Feature } from "geojson";

export type Crime = {
    id: string;
    category: string;
    outcome_status?: { category: string };
    location: { latitude: string; longitude: string };
    month: string;
};

export type CrimeFeature = Feature<Point, GeoJsonProperties>;

export type CrimeFeatureCollection = FeatureCollection<Point, GeoJsonProperties>;