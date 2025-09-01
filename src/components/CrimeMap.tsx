/* @refresh reset */

import { createEffect, onMount } from "solid-js";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import type { CrimeFeatureCollection, CrimeFeature } from "../lib/types";
import { fetchDataForViewport } from "../lib/fetch";
import { setState, state } from "../store/api-ui";
import { crimeCategories } from "../lib/categories";

const circleColorExpression = ([
    "match",
    ["get", "category"],
    ...Object.entries(crimeCategories).reduce<(string | string)[]>((acc, [key, { colour }]) => {
        acc.push(key, colour);
        return acc;
    }, []),
    "rgb(128,128,128)", // fallback
] as unknown) as any;

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
        console.log('fx', state.baseLayer)
        if (map && map.getLayer("basemap-dark") && map.getLayer("basemap-light")) {
            map.setLayoutProperty("basemap-dark", "visibility", state.baseLayer === "dark" ? "visible" : "none");
            map.setLayoutProperty("basemap-light", "visibility", state.baseLayer === "light" ? "visible" : "none");
            console.log('fx changed layer')
        }
        console.log('fx done')
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

        for (const category of state.categories) {
            const lastKey = lastQuery[category];
            const dateKey = state.date.toISOString().slice(0, 7); // YYYY-MM
            const shouldClear = lastKey !== dateKey;

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
    });

    function renderGeoJson() {
        if (!map) return;
        if (map.getSource("crimes")) {
            (map.getSource("crimes") as maplibregl.GeoJSONSource).setData(crimeGeoJSON);
        } else {
            const selectedCategories = state.categories ?? [];

            map.addSource("crimes", { type: "geojson", data: crimeGeoJSON });
            map.addLayer({
                id: "crime-points",
                type: "circle",
                source: "crimes",
                paint: {
                    // "circle-radius": 5,
                    // "circle-color": circleColorExpression,
                    "circle-radius": [
                        "+",
                        5,
                        ["index-of", ["get", "category"], ["literal", selectedCategories]],
                    ], "circle-color": circleColorExpression
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
                        </div>`
                    ).addTo(map);
            });
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

            setState("bounds", map.getBounds());
        });

        map.on("moveend", () => setState("bounds", map.getBounds()));
    });

    return <section ref={mapContainer} style="width:100vw; height:100vh" ></section>;
}
