/* @refresh reset */

import { createEffect, onMount } from "solid-js";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import type { CrimeFeatureCollection, CrimeFeature, CrimeCategory } from "../lib/types";
import { fetchDataForViewport } from "../lib/fetch";
import { setState, state } from "../store/api-ui";
import { crimeCategories } from "../lib/categories";

export default function CrimeMap() {
    let mapContainer: HTMLDivElement | undefined;

    const crimeGeoJSON: CrimeFeatureCollection = {
        type: "FeatureCollection",
        features: [],
    };

    let map: maplibregl.Map;

    // Keep track of last queries per category
    let lastQuery: Record<string, string> = {};

    // Light/dark basemap toggle
    createEffect(() => {
        if (map && map.getLayer("basemap-dark") && map.getLayer("basemap-light")) {
            map.setLayoutProperty("basemap-dark", "visibility", state.baseLayer === "dark" ? "visible" : "none");
            map.setLayoutProperty("basemap-light", "visibility", state.baseLayer === "light" ? "visible" : "none");
        }
    });

    // Re-render on state change - category, date, bounds
    createEffect(() => {
        if (!state.bounds) return;

        setState("loading", true);

        // Remove features whose categories are no longer selected
        crimeGeoJSON.features = crimeGeoJSON.features.filter(f =>
            state.categories?.includes(f.properties?.category)
        );

        renderGeoJson();

        const tilesToFetchPromises: Promise<void>[] = [];

        if (!state.categories?.length) return;

        for (const category of state.categories) {
            const lastDateKey = lastQuery[category];
            const dateKey = state.date.toISOString().slice(0, 7); // YYYY-MM
            const shouldClear = lastDateKey !== dateKey;

            if (shouldClear) {
                // Remove old features of this category for new month
                crimeGeoJSON.features = crimeGeoJSON.features.filter(f => f.properties?.category !== category);
                lastQuery[category] = dateKey;
            }

            // Fetch tiles for this category
            tilesToFetchPromises.push(
                fetchDataForViewport(state.bounds, state.date, category, (newCrimes) => {
                    const newFeatures: CrimeFeature[] = newCrimes.map((crime) => ({
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
                })
            );
        }

        Promise.all(tilesToFetchPromises).catch(err => console.error(err));

        renderGeoJson();
        setState("loading", false);
    });

    function renderGeoJson() {
        if (!map) return;

        if (map.getSource("crimes")) {
            (map.getSource("crimes") as maplibregl.GeoJSONSource).setData(crimeGeoJSON);

            // Toggle visibility for each category layer
            for (const category of Object.keys(crimeCategories) as CrimeCategory[]) {
                const visible = state.categories?.includes(category) ? "visible" : "none";
                if (map.getLayer(`crime-${category}`)) {
                    map.setLayoutProperty(`crime-${category}`, "visibility", visible);
                }
            }
        }
    }

    onMount(() => {
        map = new maplibregl.Map({
            container: mapContainer!,
            center: [-0.1278, 51.5074],
            zoom: 14,
            style: {
                version: 8,
                sources: {},
                layers: [],
            },
            attributionControl: false,
        });

        map.on("load", () => {
            // Base maps
            map.addSource("basemap-dark", {
                type: "raster",
                tiles: [
                    "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
                    "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
                    "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
                    "https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
                ],
                tileSize: 256,
            });

            map.addLayer({
                type: "raster",
                id: "basemap-dark",
                source: "basemap-dark",
                layout: { visibility: state.baseLayer === "dark" ? "visible" : "none" },
            });

            map.addSource("basemap-light", {
                type: "raster",
                tiles: [
                    "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
                    "https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
                    "https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
                    "https://d.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
                ],
                tileSize: 256,
            });

            map.addLayer({
                type: "raster",
                id: "basemap-light",
                source: "basemap-light",
                layout: { visibility: state.baseLayer === "light" ? "visible" : "none" },
            });

            // Crimes source
            map.addSource("crimes", { type: "geojson", data: crimeGeoJSON });

            // One layer per category
            for (const [category, { colour }] of Object.entries(crimeCategories)) {
                map.addLayer({
                    id: `crime-${category}`,
                    type: "circle",
                    source: "crimes",
                    filter: ["==", ["get", "category"], category],
                    paint: {
                        "circle-radius": 5,
                        "circle-color": colour,
                    },
                    layout: {
                        visibility: state.categories?.includes(category as CrimeCategory) ? "visible" : "none",
                    },
                });

                map.on("click", `crime-${category}`, (e) => {
                    const feature = e.features![0];
                    const coordinates = (feature.geometry as GeoJSON.Point).coordinates;
                    new maplibregl.Popup()
                        .setLngLat(coordinates as [number, number])
                        .setHTML(`
                            <div style="color: black; background: oldlace;">
                            <p><strong>${feature.properties.category}</strong></p>
                            <p>Outcome: ${feature.properties.outcome}</p>
                            <p>Month: ${feature.properties.month}</p>
                            </div>`
                        ).addTo(map);
                });
            }

            setState("bounds", map.getBounds());
        });

        map.on("moveend", () => setState("bounds", map.getBounds()));
    });

    return <section ref={mapContainer} style="width:100vw; height:100vh" ></section>;
}
