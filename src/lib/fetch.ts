/**
 * @example
         const bounds = map.getBounds();
           fetchCrimesByBBox(
            [bounds.getSouth(), bounds.getWest(), bounds.getNorth(), bounds.getEast()],
            date,
            crimeCategory
        );
 */
export type Crime = {
    category: string;
    outcome_status?: { category: string };
    location: { latitude: string; longitude: string };
    month: string;
};

/**
 * Fetch crimes from Police.uk using a polygon bounding box
 */
export async function fetchCrimesByBBox(
    bbox: [number, number, number, number],
    date: string,
    category: string = "rape"
): Promise<Crime[]> {
    const [minLat, minLng, maxLat, maxLng] = bbox;

    // Create polygon string in clockwise order
    const poly = [
        [minLat, minLng],
        [minLat, maxLng],
        [maxLat, maxLng],
        [maxLat, minLng],
        [minLat, minLng],
    ]
        .map((coord) => coord.join(","))
        .join(":");

    const url = `https://data.police.uk/api/crimes-street/${category}?poly=${poly}&date=${date}`;

    console.log(url);

    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const crimes: Crime[] = await res.json();
        return crimes;
    } catch (err) {
        console.error("Error fetching crimes:", err);
        return [];
    }
}
