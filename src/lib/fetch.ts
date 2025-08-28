import type { Crime } from "./types";

const MAX_REQUESTS_PER_SECOND = 10;

type TileKey = string;

interface CachedTile {
    crimes: Crime[];
    date: string; // month, e.g., '2025-06'
}

const crimeCache = new Map<TileKey, CachedTile>();

// Divide a bbox into a tile grid of n x n
function splitBBox(
    sw: [number, number],
    ne: [number, number],
    rows: number,
    cols: number
): [number, number, number, number][] {
    const [swLat, swLng] = sw;
    const [neLat, neLng] = ne;
    const latStep = (neLat - swLat) / rows;
    const lngStep = (neLng - swLng) / cols;
    const boxes: [number, number, number, number][] = [];

    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            boxes.push([
                swLat + i * latStep,
                swLng + j * lngStep,
                swLat + (i + 1) * latStep,
                swLng + (j + 1) * lngStep,
            ]);
        }
    }

    return boxes;
}

function tileKey(sw: [number, number], ne: [number, number], category: string) {
    return `${sw[0]},${sw[1]}:${ne[0]},${ne[1]}:${category}`;
}

async function fetchCrimesByBBoxCached(
    sw: [number, number],
    ne: [number, number],
    date: string,
    category: string = 'burglary'
): Promise<Crime[]> {
    const key = tileKey(sw, ne, category);
    const cached = crimeCache.get(key);

    // Return cached tile if month matches
    if (cached && cached.date === date) {
        return cached.crimes;
    }

    const crimes = await fetchCrimesByBBox(sw, ne, date, category);

    crimeCache.set(key, { crimes, date });
    return crimes;
}

export async function fetchCrimesByBBox(
    sw: [number, number],
    ne: [number, number],
    date: string,
    category: string = 'burglary'
): Promise<Crime[]> {
    try {
        const nw: [number, number] = [ne[0], sw[1]];
        const se: [number, number] = [sw[0], ne[1]];

        const poly = [sw, se, ne, nw, sw]
            .map(([lat, lng]) => `${lat},${lng}`)
            .join(":");

        const url = `https://data.police.uk/api/crimes-street/${category}?poly=${poly}&date=${date}`;

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

/**
 * Fetch crimes using tiled requests with caching and deduplication
 */
export async function fetchCrimesTiled(
    sw: [number, number],
    ne: [number, number],
    date: string,
    zoom: number,
    category: string
): Promise<Crime[]> {
    let rows = 1;
    let cols = 1;

    if (zoom < 12) rows = cols = 4;
    else if (zoom < 14) rows = cols = 2;

    const tiles = splitBBox(sw, ne, rows, cols);
    const allCrimes: Crime[] = [];
    const seen = new Set<string>();

    for (let i = 0; i < tiles.length; i += MAX_REQUESTS_PER_SECOND) {
        const batch = tiles.slice(i, i + MAX_REQUESTS_PER_SECOND);

        const batchResults = await Promise.all(
            batch.map(([sLat, sLng, nLat, nLng]) =>
                fetchCrimesByBBoxCached([sLat, sLng], [nLat, nLng], date, category)
                    .catch((err) => {
                        console.error("Tile fetch error:", err);
                        return [] as Crime[];
                    })
            )
        );

        // Merge results with deduplication
        batchResults.forEach((crimes) => {
            crimes.forEach((crime) => {
                const id = `${crime.location.latitude},${crime.location.longitude},${crime.month}`;
                if (!seen.has(id)) {
                    seen.add(id);
                    allCrimes.push(crime);
                }
            });
        });

        if (i + MAX_REQUESTS_PER_SECOND < tiles.length) {
            await new Promise((r) => setTimeout(r, 1000));
        }
    }

    return allCrimes;
}
