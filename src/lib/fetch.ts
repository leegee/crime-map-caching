import pLimit from "p-limit";
import { TileCache } from "./tiles";
import type { Crime } from "./types";

const limit = pLimit(15); // max 15 concurrent requests

async function fetchData(
    sw: [number, number],
    ne: [number, number],
    date: string | undefined,
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
        if (date) url += `&date=${date}`;
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

const tileCache = new TileCache({
    minLon: -180,
    minLat: -90,
    tileWidth: 0.25,
    tileHeight: 0.25,
});

export async function fetchDataForViewport(
    bounds: maplibregl.LngLatBounds,
    date?: string,
    category: string = "burglary"
): Promise<Crime[]> {
    const minLon = bounds.getWest();
    const minLat = bounds.getSouth();
    const maxLon = bounds.getEast();
    const maxLat = bounds.getNorth();

    const tilesToFetch = tileCache.getTilesToFetch(minLon, minLat, maxLon, maxLat);

    // Map tiles to limited fetch promises
    const fetchPromises = tilesToFetch.map(([tileX, tileY]) =>
        limit(async () => {
            const tileBBox = tileCache.tileToBBox(tileX, tileY);
            const sw: [number, number] = [tileBBox.minLat, tileBBox.minLon]; // lat, lon
            const ne: [number, number] = [tileBBox.maxLat, tileBBox.maxLon]; // lat, lon

            const crimes = await fetchData(sw, ne, date, category);
            tileCache.markTileLoaded(tileX, tileY); // mark tile loaded
            return crimes;
        })
    );

    const results = await Promise.all(fetchPromises);
    return results.flat();
}
