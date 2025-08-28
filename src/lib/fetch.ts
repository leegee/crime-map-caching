import type { Crime } from "./types";

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
        // Compute the other corners
        const nw: [number, number] = [ne[0], sw[1]];
        const se: [number, number] = [sw[0], ne[1]];

        // Construct polygon string, closing the polygon
        const poly = [sw, se, ne, nw, sw]
            .map(([lat, lng]) => `${lat},${lng}`)
            .join(":");

        const url = `https://data.police.uk/api/crimes-street/${category}?poly=${poly}&date=${date}`;

        console.log("Fetching crimes from URL:", url);

        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

        const crimes: Crime[] = await res.json();
        return crimes;
    } catch (err) {
        console.error("Error fetching crimes:", err);
        return [];
    }
}
