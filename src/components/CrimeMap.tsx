// src/components/CrimeMap.tsx
import { onMount } from "solid-js";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { fetchCrimesByBBox } from "../lib/fetch";

const crimeCategory = 'rape';

type Crime = {
    category: string;
    outcome_status?: { category: string };
    location: { latitude: string; longitude: string };
    month: string;
};

type CrimeProperties = {
    category: string;
    outcome: string;
    month: string;
};

type CrimeFeature = GeoJSON.Feature<GeoJSON.Point, CrimeProperties>;

export default function CrimeMap() {
    let mapContainer: HTMLDivElement | undefined;

    const crimeGeoJSON: GeoJSON.FeatureCollection<GeoJSON.Point, CrimeProperties> = {
        type: "FeatureCollection",
        features: [],
    };

    let map: maplibregl.Map;
    let lastQueryDate: string | null = null;

    async function updateCrimesInBBox(bbox: [number, number, number, number], date: string) {
        try {
            const crimes: Crime[] = await fetchCrimesByBBox(bbox, date, crimeCategory);

            if (!crimes.length) {
                console.warn("No crime data for this bbox/date");
                return;
            }

            // Only clear features if the date changed
            if (lastQueryDate !== date) {
                crimeGeoJSON.features = [];
                lastQueryDate = date;
            }

            const newFeatures: CrimeFeature[] = crimes.map((crime) => ({
                type: "Feature",
                geometry: {
                    type: "Point",
                    coordinates: [
                        parseFloat(crime.location.longitude),
                        parseFloat(crime.location.latitude),
                    ],
                },
                properties: {
                    category: crime.category,
                    outcome: crime.outcome_status?.category || "Unknown",
                    month: crime.month,
                },
            }));

            crimeGeoJSON.features.push(...newFeatures);
            renderCrimes();
        } catch (err) {
            console.error("Error fetching crimes:", err);
        }
    }

    function renderCrimes() {
        if (!map) return;
        if (map.getSource("crimes")) {
            (map.getSource("crimes") as maplibregl.GeoJSONSource).setData(crimeGeoJSON);
        } else {
            map.addSource("crimes", { type: "geojson", data: crimeGeoJSON });
            map.addLayer({
                id: "crime-points",
                type: "circle",
                source: "crimes",
                paint: {
                    "circle-radius": 5,
                    "circle-color": [
                        "match",
                        ["get", "category"],
                        "violent-crime",
                        "#ff0000",
                        "sexual-offences",
                        "#ff69b4",
                        "robbery",
                        "#ffa500",
                        "#888",
                    ],
                },
            });

            map.on("click", "crime-points", (e) => {
                const feature = e.features![0];
                const coordinates = (feature.geometry as GeoJSON.Point).coordinates;
                new maplibregl.Popup()
                    .setLngLat(coordinates as [number, number])
                    .setHTML(`
            <strong>${feature.properties.category}</strong><br/>
            Outcome: ${feature.properties.outcome}<br/>
            Month: ${feature.properties.month}
          `)
                    .addTo(map);
            });
        }
    }

    onMount(() => {
        map = new maplibregl.Map({
            container: mapContainer!,
            center: [-0.1278, 51.5074], // London
            zoom: 12,
            style: {
                version: 8,
                sources: {
                    basemap: {
                        type: "raster",
                        tiles: [
                            "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
                            "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
                            "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
                            "https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
                        ],
                        tileSize: 256,
                        attribution:
                            '© <a href="https://carto.com/">CARTO</a> © <a href="https://www.openstreetmap.org/copyright">OSM</a>',
                    },
                },
                layers: [
                    {
                        id: "basemap",
                        type: "raster",
                        source: "basemap",
                        minzoom: 0,
                        maxzoom: 19,
                    },
                ],
            },
            attributionControl: false,
        });

        const now = new Date();
        const latestMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const year = latestMonth.getFullYear();
        const month = String(latestMonth.getMonth() + 1).padStart(2, "0");
        const date = `${year}-${month}`;

        const bounds = map.getBounds();
        updateCrimesInBBox(
            [bounds.getSouthWest().lng, bounds.getSouthWest().lat, bounds.getNorthEast().lng, bounds.getNorthEast().lat],
            date,
        );

        map.on("moveend", () => {
            const bounds = map.getBounds();
            updateCrimesInBBox(
                [bounds.getSouthWest().lng, bounds.getSouthWest().lat, bounds.getNorthEast().lng, bounds.getNorthEast().lat],
                date,
            );
        });
    });

    return <div ref={mapContainer} style="width:100vw;height:100vh;"></div>;
}
