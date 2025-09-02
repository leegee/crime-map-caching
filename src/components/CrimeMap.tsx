/* @refresh reset */

import { createEffect, onMount } from "solid-js";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import styles from './CrimeMap.module.scss';
import type { CrimeFeatureCollection, CrimeFeature, CrimeCategory } from "../lib/types";
import { fetchDataForViewport } from "../lib/fetch";
import { crimeCategories } from "../lib/categories";
import { setState, state } from "../store/api-ui";

export default function CrimeMap() {
    let mapContainer: HTMLDivElement | undefined;
    let mapLoaded = false;

    const crimeGeoJSON: CrimeFeatureCollection = {
        type: "FeatureCollection",
        features: [],
    };

    let map: maplibregl.Map;

    // Keep track of last queries per category
    let lastQuery: Record<string, string> = {};

    // Light/dark basemap toggle
    createEffect(() => {
        if (state.baseLayer && mapLoaded) {
            map.setLayoutProperty("basemap-layer-dark", "visibility", state.baseLayer === "dark" ? "visible" : "none");
            map.setLayoutProperty("basemap-layer-light", "visibility", state.baseLayer === "light" ? "visible" : "none");
        }
    });

    // Re-render on state change - category, date, bounds
    createEffect(() => {
        if (!state.bounds) return;

        // Remove features whose categories are no longer selected
        crimeGeoJSON.features = crimeGeoJSON.features.filter(f =>
            state.categories?.includes(f.properties?.category)
        );

        renderGeoJson();

        const tilesToFetchPromises: Promise<void>[] = [];

        if (!state.categories?.length) return;

        setState("loading", true);

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
            interactive: true,
            attributionControl: false,
        });

        map.getCanvas().style.cursor = "default";

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
                id: "basemap-layer-dark",
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
                id: "basemap-layer-light",
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

                map.on("mouseenter", `crime-${category}`, () => {
                    map.getCanvas().style.cursor = "pointer";
                });
                map.on("mouseleave", `crime-${category}`, () => {
                    map.getCanvas().style.cursor = "default";
                });

                map.on("click", `crime-${category}`, (e) => {
                    const feature = e.features![0];
                    const coordinates = (feature.geometry as GeoJSON.Point).coordinates;
                    new maplibregl.Popup()
                        .setLngLat(coordinates as [number, number])
                        .setHTML(`
                            <article class="primary-container no-elevate">
                            <p><strong>${crimeCategories[feature.properties.category as CrimeCategory].description}</strong></p>
                            <p>Outcome: ${feature.properties.outcome}</p>
                            <p>Month: ${feature.properties.month}</p>
                            </article>`
                        ).addTo(map);
                });
            }

            setState("bounds", map.getBounds());
            mapLoaded = true;
        });

        map.on("moveend", () => setState("bounds", map.getBounds()));
    });

    return <div ref={mapContainer} class={styles["map-container"] + " " + styles[state.baseLayer]} ></div>
}
