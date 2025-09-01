import pLimit from "p-limit";
import { TileCache } from "./tiles";
import type { Crime } from "./types";

type CrimeCallback = (crimes: Crime[]) => void;

const limit = pLimit(10); // max concurrent requests
const latLngPrecision = 6;

async function fetchData(
    sw: [number, number],
    ne: [number, number],
    date: Date,
    category: string = "burglary"
): Promise<Crime[]> {
    try {
        console.log('sw, ne', sw, ne);
        const nw: [number, number] = [ne[0], sw[1]];
        const se: [number, number] = [sw[0], ne[1]];

        const poly = [sw, nw, ne, se, sw]
            .map(([lat, lng]) => `${lat},${lng}`)
            .join(":");

        let url = `https://data.police.uk/api/crimes-street/${category}?poly=${poly}`;
        if (date) url += `&date=${formatDateForUrl(date)}`;
        console.log("Fetching crimes from URL:", url);

        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP error - status: ${res.status}`);

        const crimes: Crime[] = await res.json();
        return crimes;
    } catch (err) {
        console.error("Error fetching crimes:", err);
        return [];
    }
}

/*
 * Latitude: 5 miles ≈ 5 / 69 ≈ 0.072°
 * Longitude: 5 miles ≈ 5 / 43 ≈ 0.116°
*/

const tileCache = new TileCache({
    minLon: -180,
    minLat: -90,
    tileWidth: 0.125,  // ~5 miles longitude in London
    tileHeight: 0.072, // ~5 miles latitude
});

const formatDateForUrl = (date: Date): string => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

export async function fetchDataForViewport(
    bounds: maplibregl.LngLatBounds,
    date: Date,
    category: string = "violent-crime",
    onTileData?: CrimeCallback,
): Promise<boolean> {
    const minLon = Number(bounds.getWest().toFixed(latLngPrecision));
    const minLat = Number(bounds.getSouth().toFixed(latLngPrecision));
    const maxLon = Number(bounds.getEast().toFixed(latLngPrecision));
    const maxLat = Number(bounds.getNorth().toFixed(latLngPrecision));

    const tilesToFetch = tileCache.getTilesToFetch(category, date, minLon, minLat, maxLon, maxLat);

    // Map tiles to limited fetch promises
    const fetchPromises = tilesToFetch.map(([tileX, tileY]) =>
        limit(async () => {
            const tileBBox = tileCache.tileToBBox(tileX, tileY);
            const sw: [number, number] = [tileBBox.minLat, tileBBox.minLon];
            const ne: [number, number] = [tileBBox.maxLat, tileBBox.maxLon];

            const crimes = await fetchData(sw, ne, date, category);
            tileCache.markTileLoaded(category, date, tileX, tileY);

            if (onTileData && crimes.length) {
                onTileData(crimes);
            }

            return crimes;
        })
    );

    // const results = await Promise.all(fetchPromises);
    // return results.flat();
    await Promise.all(fetchPromises);
    return true;
}
