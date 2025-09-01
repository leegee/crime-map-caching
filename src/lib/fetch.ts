import pLimit from "p-limit";
import { TileCache, type TileCoord } from "./tiles";
import type { Crime } from "./types";
import { retry } from "./retry";
import { formatDateForUrl } from "./format-date";

type CrimeCallback = (crimes: Crime[]) => void;

const limit = pLimit(10); // max concurrent requests
const latLngPrecision = 6;

async function fetchData(
    sw: [number, number],
    ne: [number, number],
    date: Date,
    category: string = "burglary"
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

/*
 * Latitude: 5 miles ≈ 5 / 69 ≈ 0.072 degrees
 * Longitude: 5 miles ≈ 5 / 43 ≈ 0.116 degrees
*/

const tileCache = new TileCache({
    minLon: -180,
    minLat: -90,
    tileHeight: 0.072,
    tileWidth: 0.125,
});


export async function fetchDataForViewport(
    bounds: maplibregl.LngLatBounds,
    date: Date,
    category: string = "violent-crime",
    onTileData?: CrimeCallback
): Promise<void> {
    const minLon = Number(bounds.getWest().toFixed(latLngPrecision));
    const minLat = Number(bounds.getSouth().toFixed(latLngPrecision));
    const maxLon = Number(bounds.getEast().toFixed(latLngPrecision));
    const maxLat = Number(bounds.getNorth().toFixed(latLngPrecision));

    const dateKey = formatDateForUrl(date);

    // Get all tiles covering the viewport
    const tilesInView = tileCache.getTilesInBBox(minLon, minLat, maxLon, maxLat);

    const tilesToFetch: TileCoord[] = [];

    for (const [x, y] of tilesInView) {
        if (tileCache.isTileLoaded(category, dateKey, x, y)) {
            tileCache.updateLruTimestamp(category, dateKey, x, y);
        } else {
            tilesToFetch.push([x, y]);
        }
    }

    // Fetch missing tiles in parallel with a limit
    const fetchPromises = tilesToFetch.map(([tileX, tileY]) =>
        limit(async () => {
            const tileBBox = tileCache.tileToBBox(tileX, tileY);
            const sw: [number, number] = [tileBBox.minLat, tileBBox.minLon];
            const ne: [number, number] = [tileBBox.maxLat, tileBBox.maxLon];

            try {
                const crimes = await retry(() =>
                    fetchData(sw, ne, date, category),
                    3,
                    500
                );

                if (crimes.length > 0) {
                    tileCache.markTileLoaded(category, dateKey, tileX, tileY);

                    if (onTileData) {
                        onTileData(crimes);
                    }
                } else {
                    console.log("No data for tile", tileX, tileY);
                }

                return crimes;
            } catch (err) {
                console.warn(
                    `Failed to fetch tile (${tileX}, ${tileY}), will retry later.`,
                    err
                );
                return [];
            }
        })
    );

    await Promise.all(fetchPromises);
}
