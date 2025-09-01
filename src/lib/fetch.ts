
/*
 * NB: 
 *
 * Latitude: 5 miles ≈ 5 / 69 ≈ 0.072 degrees
 * Longitude: 5 miles ≈ 5 / 43 ≈ 0.116 degrees
*/

import pLimit from "p-limit";
import { TileCache } from "./tiles";
import type { Crime } from "./types";
import { retry } from "./retry";
import { formatDateForUrl } from "./format-date";

type CrimeCallback = (crimes: Crime[]) => void;

const RETRIES = 3;
const RETRY_DELAY_MS = 500;
const MAX_CONCURRENT_REQUESTS = pLimit(10);
const LAT_LNG_PRECISION = 6;

async function fetchData(
    sw: [number, number],
    ne: [number, number],
    date: Date,
    category: string = "violent-crime"
): Promise<Crime[]> {
    console.log("sw, ne", sw, ne);
    const nw: [number, number] = [ne[0], sw[1]];
    const se: [number, number] = [sw[0], ne[1]];

    const poly = [sw, nw, ne, se, sw]
        .map(([lat, lng]) => `${lat},${lng}`)
        .join(":");

    let url = `https://data.police.uk/api/crimes-street/${category}?poly=${poly}`;
    if (date) url += `&date=${formatDateForUrl(date)}`;
    console.log("Fetching crimes from URL:", url);
    console.log("Date", formatDateForUrl(date));

    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error - status: ${res.status}`);

    const crimes: Crime[] = await res.json();
    return crimes;
}

const tileCache = new TileCache({
    minLon: -180,
    minLat: -90,
    tileHeight: 0.072,
    tileWidth: 0.125,
});

await tileCache.initFromDb();

export async function fetchDataForViewport(
    bounds: maplibregl.LngLatBounds,
    date: Date,
    category: string = "violent-crime",
    onTileData?: CrimeCallback
): Promise<void> {
    const minLon = Number(bounds.getWest().toFixed(LAT_LNG_PRECISION));
    const minLat = Number(bounds.getSouth().toFixed(LAT_LNG_PRECISION));
    const maxLon = Number(bounds.getEast().toFixed(LAT_LNG_PRECISION));
    const maxLat = Number(bounds.getNorth().toFixed(LAT_LNG_PRECISION));

    const dateKey = formatDateForUrl(date);

    // Get all tiles covering the viewport
    const tilesInView = tileCache.getTilesInBBox(minLon, minLat, maxLon, maxLat);

    // Immediately render cached tiles
    for (const [tileX, tileY] of tilesInView) {
        const cached = tileCache.getTileData(category, dateKey, tileX, tileY);
        if (cached && onTileData) {
            onTileData(cached);
            tileCache.updateLruTimestamp(category, dateKey, tileX, tileY);
        }
    }

    // Determine which tiles actually need fetching
    const tilesToFetch = tileCache.getTilesToFetchWithLruUpdate(category, dateKey, tilesInView);

    // Fetch missing tiles in parallel with a concurrency limit
    const fetchPromises = tilesToFetch.map(([tileX, tileY]) =>
        MAX_CONCURRENT_REQUESTS(async () => {
            const tileBBox = tileCache.tileToBBox(tileX, tileY);
            const sw: [number, number] = [tileBBox.minLat, tileBBox.minLon];
            const ne: [number, number] = [tileBBox.maxLat, tileBBox.maxLon];

            try {
                const crimes = await retry(() =>
                    fetchData(sw, ne, date, category),
                    RETRIES,
                    RETRY_DELAY_MS
                );

                if (crimes.length > 0) {
                    await tileCache.markTileLoaded(category, dateKey, tileX, tileY, crimes);

                    if (onTileData) {
                        onTileData(crimes);
                    }
                } else {
                    console.log("No data for tile", tileX, tileY);
                }

                return crimes;
            } catch (err) {
                console.warn(`Failed to fetch tile (${tileX}, ${tileY}), will retry later.`, err);
                return [];
            }
        })
    );

    try {
        await Promise.all(fetchPromises);
    } finally {
        await tileCache.purgeIfNeeded();
    }
}
