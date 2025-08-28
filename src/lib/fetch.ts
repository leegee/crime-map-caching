import type { Crime } from "./types";

const MAX_REQUESTS_PER_SECOND = 10;

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



/**
 * Fetch crimes from Police.uk API within a bounding box (polygon), for a given category and month.
 * @param sw South-west coordinate [lat, lng]
 * @param ne North-east coordinate [lat, lng]
 * @param date YYYY-MM string (past month)
 * @param category crime category (e.g., 'all-crime', 'rape')
 * @example
 
    const crimes = await fetchCrimesByBBox(
        [bounds.getSouth(), bounds.getWest()],
        [bounds.getNorth(), bounds.getEast()],
        date,
        'rape'
    );

 */
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

    for (let i = 0; i < tiles.length; i += MAX_REQUESTS_PER_SECOND) {
        const batch = tiles.slice(i, i + MAX_REQUESTS_PER_SECOND);

        const batchResults = await Promise.all(
            batch.map(([sLat, sLng, nLat, nLng]) =>
                fetchCrimesByBBox([sLat, sLng], [nLat, nLng], date, category).catch((err) => {
                    console.error("Tile fetch error:", err);
                    return [] as Crime[];
                })
            )
        );

        batchResults.forEach((crimes) => allCrimes.push(...crimes));

        if (i + MAX_REQUESTS_PER_SECOND < tiles.length) {
            await new Promise((r) => setTimeout(r, 1000));
        }
    }

    return allCrimes;
}
