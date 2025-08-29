
import { createEffect, onMount } from "solid-js";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import type { CrimeFeatureCollection, CrimeFeature } from "../lib/types";
import { fetchDataForViewport } from "../lib/fetch";
import { setState, state } from "../store/api-ui";
import { crimeCategories } from "../lib/categories";

const circleColorExpression: any[] = ["match", ["get", "category"]];

for (const [key, { colour }] of Object.entries(crimeCategories)) {
    circleColorExpression.push(key, colour);
}

circleColorExpression.push("rgb(128,128,128)");

export default function CrimeMap() {
    let mapContainer: HTMLDivElement | undefined;

    const crimeGeoJSON: CrimeFeatureCollection = {
        type: "FeatureCollection",
        features: [],
    };

    let map: maplibregl.Map;
    let lastQueryDate: Date | null = null;
    let lastQueryCategory: CrimeCategory | null = null;

    createEffect(() => {
        if (!state.bounds) return;

        (async () => {
            try {
                const data = await fetchDataForViewport(state.bounds!, state.date, state.category);

                if (!data || !data.length) return;

                // Clear previous features - this will change to allow overlays of features
                if (!lastQueryDate || lastQueryDate.getTime() !== state.date.getTime() ||
                    !lastQueryCategory || lastQueryCategory !== state.category
                ) {
                    crimeGeoJSON.features = [];
                    lastQueryDate = state.date;
                }

                const newFeatures: CrimeFeature[] = data.map((crime) => ({
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
        })();
    });

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
                    "circle-color": circleColorExpression,
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

        map.on('load', () => setState("bounds", map.getBounds()));
        map.on("moveend", () => setState("bounds", map.getBounds()));
    });

    return <section ref={mapContainer} style="width:100vw;height:100vh;"></section>;
}
