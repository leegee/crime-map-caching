
/*
 * NB: 
 *
 * Latitude: 5 miles ≈ 5 / 69 ≈ 0.072 degrees
 * Longitude: 5 miles ≈ 5 / 43 ≈ 0.116 degrees
*/

import pLimit from "p-limit";
import { TileCache } from "./TileCache";
import type { Crime, CrimeRecord } from "./types";
import { flattenCrime } from "./flatten-crime";
import { retry } from "./retry";
import { formatDateForUrl } from "./format-date";

export type TileDataCallback = (records: CrimeRecord[]) => void;

const RETRIES = 3;
const RETRY_DELAY_MS = 500;
const MAX_CONCURRENT_REQUESTS = pLimit(10);
const LAT_LNG_PRECISION = 6;

const ongoingTileRequests = new Map<string, AbortController>();

async function fetchData(
    sw: [number, number],
    ne: [number, number],
    date: Date,
    category: string = "violent-crime",
    signal?: AbortSignal
): Promise<Crime[]> {
    const nw: [number, number] = [ne[0], sw[1]];
    const se: [number, number] = [sw[0], ne[1]];

    const poly = [sw, nw, ne, se, sw]
        .map(([lat, lng]) => `${ lat },${ lng }`)
        .join(":");

    let url = `https://data.police.uk/api/crimes-street/${ category }?poly=${ poly }`;
    if (date) url += `&date=${ formatDateForUrl(date) }`;
    console.log("Fetching crimes from URL:", url);

    const res = await fetch(url, { signal });

    if (res.status === 429) {
        const retryAfter = res.headers.get("retry-after");

        const error = new Error(
            `Police API rate limited${ retryAfter ? `, retry after ${ retryAfter }s` : "" }`
        );

        (error as any).retryAfter = retryAfter;
        throw error;
    }

    if (!res.ok) throw new Error(`HTTP error - status: ${ res.status }`);

    const crimes: Crime[] = await res.json();
    return crimes;
}

const tileCache = new TileCache<CrimeRecord[]>({
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
    onTileData?: TileDataCallback
): Promise<void> {
    const minLon = Number(bounds.getWest().toFixed(LAT_LNG_PRECISION));
    const minLat = Number(bounds.getSouth().toFixed(LAT_LNG_PRECISION));
    const maxLon = Number(bounds.getEast().toFixed(LAT_LNG_PRECISION));
    const maxLat = Number(bounds.getNorth().toFixed(LAT_LNG_PRECISION));

    const dateKey = formatDateForUrl(date);
    const tilesInView = tileCache.getTilesInBBox(minLon, minLat, maxLon, maxLat);

    const tilesInViewKeys = new Set(
        tilesInView.map(([x, y]) => `${ category }-${ dateKey }-${ x }-${ y }`)
    );

    // Abort tiles no longer in view
    for (const [tileKey, controller] of ongoingTileRequests.entries()) {
        if (!tilesInViewKeys.has(tileKey)) {
            controller.abort();
            ongoingTileRequests.delete(tileKey);
        }
    }

    // Render cached tiles once
    const renderedTiles = new Set<string>();
    for (const [tileX, tileY] of tilesInView) {
        const tileKey = `${ category }-${ dateKey }-${ tileX }-${ tileY }`;
        if (renderedTiles.has(tileKey)) continue;

        const cached = tileCache.getTile(category, dateKey, tileX, tileY);
        if (cached && onTileData) {
            onTileData(cached);
            renderedTiles.add(tileKey);
            tileCache.updateLruTimestamp(category, dateKey, tileX, tileY);
        }
    }

    // Fetch missing tiles
    const tilesToFetch = tileCache.getTilesToFetchWithLruUpdate(category, dateKey, tilesInView)
        .filter(([x, y]) => !ongoingTileRequests.has(`${ category }-${ dateKey }-${ x }-${ y }`));

    const fetchPromises = tilesToFetch.map(([tileX, tileY]) =>
        MAX_CONCURRENT_REQUESTS(async () => {
            const tileKey = `${ category }-${ dateKey }-${ tileX }-${ tileY }`;
            const controller = new AbortController();
            ongoingTileRequests.set(tileKey, controller);

            const tileBBox = tileCache.tileToBBox(tileX, tileY);
            const sw: [number, number] = [tileBBox.minLat, tileBBox.minLon];
            const ne: [number, number] = [tileBBox.maxLat, tileBBox.maxLon];

            try {
                const crimes = await retry(
                    () => fetchData(sw, ne, date, category, controller.signal),
                    RETRIES,
                    RETRY_DELAY_MS
                );
                if (crimes.length && onTileData) {
                    const records = crimes.map(flattenCrime)
                    await tileCache.storeTile(category, dateKey, tileX, tileY, records);
                    onTileData(records);
                }
            }

            catch (err) {
                if ((err as any).name === "AbortError") {
                    console.log(`Tile fetch aborted: ${ tileKey }`);
                } else {
                    console.warn(`Failed to fetch tile (${ tileX }, ${ tileY })`, err);
                }
            }

            finally {
                ongoingTileRequests.delete(tileKey);
            }
        })
    );

    try {
        await Promise.all(fetchPromises);
    } finally {
        await tileCache.purgeIfNeeded();
    }
}

