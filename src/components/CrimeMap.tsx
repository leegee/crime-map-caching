
import { onMount } from "solid-js";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { CrimeFeatureCollection, CrimeFeature } from "../lib/types";
import { fetchCrimesByBBox, fetchCrimesTiled } from "../lib/fetch";

const crimeCategory = 'violent-crime';
const now = new Date();
const latestMonth = new Date(now.getFullYear(), now.getMonth() - 2, 1);
const year = latestMonth.getFullYear();
const month = String(latestMonth.getMonth() + 1).padStart(2, "0");
const date = `${year}-${month}`;

export default function CrimeMap() {
    let mapContainer: HTMLDivElement | undefined;

    const crimeGeoJSON: CrimeFeatureCollection = {
        type: "FeatureCollection",
        features: [],
    };

    let map: maplibregl.Map;
    let lastQueryDate: string | null = null;

    async function updateDataInBounds() {
        const bounds = map.getBounds();

        try {
            const crimes = await fetchCrimesByBBox(
                [bounds.getSouth(), bounds.getWest()],
                [bounds.getNorth(), bounds.getEast()],
                date,
                crimeCategory
            );

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
            renderGeoJson();
        } catch (err) {
            console.error("Error fetching crimes:", err);
        }
    }

    async function updateDataInBounds2() {
        if (lastQueryDate !== date) {
            crimeGeoJSON.features = [];
            lastQueryDate = date;
        }

        const boundsArray = map.getBounds().toArray();
        const sw: [number, number] = [boundsArray[0][1], boundsArray[0][0]];
        const ne: [number, number] = [boundsArray[1][1], boundsArray[1][0]];

        const crimes = await fetchCrimesTiled(sw, ne, date, map.getZoom(), crimeCategory);

        if (!crimes.length) {
            console.warn("No crime data for this bbox/date");
            return;
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
        renderGeoJson();
    }

    function renderGeoJson() {
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
            <div style="color: black; background: oldlace;">
                <p><strong>${feature.properties.category}</strong></p>
                <p>Outcome: ${feature.properties.outcome}</p>
                <p>Month: ${feature.properties.month}</p>
            </div>
          `)
                    .addTo(map);
            });
        }
    }

    onMount(() => {
        map = new maplibregl.Map({
            container: mapContainer!,
            center: [-0.1278, 51.5074], // London
            zoom: 14,
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

        // map.on('load', updateDataInBounds);
        // map.on("moveend", updateDataInBounds);

        map.on("load", updateDataInBounds2);
        map.on("moveend", updateDataInBounds2);
    });

    return <div ref={mapContainer} style="width:100vw;height:100vh;"></div>;
}
