/* @refresh reset */

import { createEffect, createSignal, onCleanup, onMount } from "solid-js";
import maplibregl, { type ExpressionSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import styles from './CrimeMap.module.scss';
import type { CrimeFeatureCollection, CrimeFeature, CrimeCategory } from "../lib/types";
import { fetchDataForViewport } from "../lib/fetch";
import { crimeCategories } from "../lib/categories";
import { setState, state } from "../store/api-ui";
import { courtDisposals, outcomeDescriptionToKey } from "../lib/court-disposals";
import type { GeocodeEventDetail } from "./controls/GeoCode";

function buildOutcomeStrokeExpression(): ExpressionSpecification {
    if (!state.outcomes || !state.outcomes.length) {
        return "rgba(0,0,0,0)" as unknown as ExpressionSpecification;
    }

    return [
        "match",
        ["get", "outcomeKey"], // use stable key per feature
        ...state.outcomes.flatMap(outcomeKey => {
            const colour = courtDisposals[outcomeKey]?.colour || "#888";
            return [outcomeKey, colour];
        }),
        "rgba(0,0,0,0)" // fallback
    ] as unknown as ExpressionSpecification;
}

export default function CrimeMap() {
    let mapContainer: HTMLDivElement | undefined;
    let popup: maplibregl.Popup | null = null;

    const [mapLoaded, setMapLoaded] = createSignal(false);

    const crimeGeoJSON: CrimeFeatureCollection = {
        type: "FeatureCollection",
        features: [],
    };

    let map: maplibregl.Map;

    // Keep track of last queries per category
    let lastQuery: Record<string, string> = {};

    // Light/dark basemap toggle
    createEffect(() => {
        const showLabels = state.showLabels;
        if (state.baseLayer && mapLoaded()) {
            map.setLayoutProperty("basemap-layer-dark", "visibility", state.baseLayer === "dark" ? "visible" : "none");
            map.setLayoutProperty("basemap-layer-light", "visibility", state.baseLayer === "light" ? "visible" : "none");
            map.setLayoutProperty("basemap-layer-dark-labels", "visibility", state.baseLayer === "dark" && showLabels ? "visible" : "none");
            map.setLayoutProperty("basemap-layer-light-labels", "visibility", state.baseLayer === "light" && showLabels ? "visible" : "none");
        }
    });


    // When outcomes/court disposal filters are applied, update the way the mapped circles are painted
    createEffect(() => {
        if (!state.outcomes || !mapLoaded()) return;
        const strokeColor = state.outcomes.length ? buildOutcomeStrokeExpression() : "rgba(0,0,0,0)";
        const strokeWidth = state.outcomes.length ? 5 : 0;

        for (const category of Object.keys(crimeCategories) as CrimeCategory[]) {
            if (map.getLayer(`crime-${category}`)) {
                map.setPaintProperty(`crime-${category}`, "circle-stroke-color", strokeColor);
                map.setPaintProperty(`crime-${category}`, "circle-stroke-width", strokeWidth);
            }
        }
    });

    // Re-render on state change - category, date, bounds
    createEffect(async () => {
        if (!state.bounds) return;

        if (popup) popup.remove();

        // Filters:

        // Remove features whose categories are no longer selected
        crimeGeoJSON.features = crimeGeoJSON.features.filter(f =>
            state.categories?.includes(f.properties?.category)
        );

        if (state.outcomes?.length) {
            crimeGeoJSON.features = crimeGeoJSON.features.filter(f =>
                state.outcomes.includes(f.properties?.outcome)
            );
        }

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
                    const newFeatures: CrimeFeature[] = newCrimes.map((crime) => {
                        const outcomeDesc = crime.outcome_status?.category;
                        const outcomeKey = outcomeDesc ? outcomeDescriptionToKey[outcomeDesc] : "unknown";

                        return {
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
                                outcome: outcomeDesc || "Unknown",   // human-readable
                                outcomeKey,                          // stable key
                                month: crime.month,
                                streetName: crime.location.street.name,
                                context: crime.context,
                            },
                        };
                    });

                    const filtered = state.outcomes?.length
                        ? newFeatures.filter(f => f.properties?.outcomeKey && state.outcomes.includes(f.properties.outcomeKey))
                        : newFeatures;

                    crimeGeoJSON.features.push(...filtered);
                    renderGeoJson();
                })
            );

        }

        await Promise.all(tilesToFetchPromises).catch(err => console.error(err));

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

    function handleGeocodeEvent(e: CustomEvent<GeocodeEventDetail>) {
        console.log("handleGeocodeEvent", e.detail);
        map.flyTo({
            center: [e.detail.lon, e.detail.lat],
            zoom: 16,
            speed: 1.2,
            curve: 1.42,
        });
    }

    onCleanup(() => {
        window.removeEventListener("geocode", handleGeocodeEvent as EventListener);
    });

    onMount(() => {
        window.addEventListener("geocode", handleGeocodeEvent as EventListener);

        map = new maplibregl.Map({
            container: mapContainer!,
            center: [-0.1278, 51.5074],
            zoom: 14,
            minZoom: 13,
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
                    "https://a.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png",
                    "https://b.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png",
                    "https://c.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png",
                    "https://d.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png",
                ],
                tileSize: 256,
            });

            map.addLayer({
                type: "raster",
                id: "basemap-layer-dark",
                source: "basemap-dark",
                layout: { visibility: state.baseLayer === "dark" ? "visible" : "none" },
            });

            map.addSource("basemap-dark-labels", {
                type: "raster",
                tiles: [
                    "https://a.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png",
                    "https://b.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png",
                    "https://c.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png",
                    "https://d.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png",
                ],
                tileSize: 256,
            });

            map.addLayer({
                type: "raster",
                id: "basemap-layer-dark-labels",
                source: "basemap-dark-labels",
                layout: { visibility: state.baseLayer === "dark" && state.showLabels ? "visible" : "none" },
            });


            map.addSource("basemap-light", {
                type: "raster",
                tiles: [
                    "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
                    // "https://a.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png",
                    // "https://b.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png",
                    // "https://c.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png",
                    // "https://d.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png",
                ],
                tileSize: 256,
            });

            map.addLayer({
                type: "raster",
                id: "basemap-layer-light",
                source: "basemap-light",
                layout: { visibility: state.baseLayer === "light" ? "visible" : "none" },
            });

            map.addSource("basemap-light-labels", {
                type: "raster",
                tiles: [
                    "https://a.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png",
                    "https://b.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png",
                    "https://c.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png",
                    "https://d.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png",
                ],
                tileSize: 256,
            });

            map.addLayer({
                type: "raster",
                id: "basemap-layer-light-labels",
                source: "basemap-light-labels",
                layout: { visibility: state.baseLayer === "light" && state.showLabels ? "visible" : "none" },
            });

            // Crimes source
            map.addSource("crimes", {
                type: "geojson",
                data: crimeGeoJSON,
            });

            // One layer per category
            for (const [category, { colour }] of Object.entries(crimeCategories)) {
                map.addLayer({
                    id: `crime-${category}`,
                    type: "circle",
                    source: "crimes",
                    filter: ["==", ["get", "category"], category],
                    paint: {
                        "circle-radius": 10,
                        "circle-color": colour,
                        "circle-stroke-color": buildOutcomeStrokeExpression(),
                        "circle-stroke-width": 5,
                    },
                    layout: {
                        visibility: state.categories?.includes(category as CrimeCategory) ? "visible" : "none",
                    },
                });

                map.on("mouseenter", `crime-${category}`, () => map.getCanvas().style.cursor = "pointer");
                map.on("mouseleave", `crime-${category}`, () => map.getCanvas().style.cursor = "default");

                map.on("click", `crime-${category}`, (e) => {
                    const feature = e.features![0];
                    const coordinates = (feature.geometry as GeoJSON.Point).coordinates;
                    popup = new maplibregl.Popup({
                        closeOnClick: true,
                        closeButton: false,
                    })
                        .setLngLat(coordinates as [number, number])
                        .setHTML(`
                            <article class="primary-container no-elevate no-padding">
                                <table>
                                        <tr>
                                            <th>Street</th>
                                            <td>${feature.properties.streetName}</td>
                                        </tr><tr>
                                            <th>Category</th>
                                            <td>${crimeCategories[feature.properties.category as CrimeCategory].description}</td>
                                        </tr><tr>
                                            <th>Outcome</th>
                                            <td>${feature.properties.outcome}</td>
                                        </tr><tr>
                                            <th>Month</th>
                                            <td>${feature.properties.month}</td>
                                        </tr><tr>
                                            <th>Context</th>
                                            <td>${feature.properties.context || 'None provided'}</td>
                                        </tr>
                                    </table>
                                </article>`
                        ).addTo(map);
                });
            }

            setState("bounds", map.getBounds());
            setMapLoaded(true);
        });

        map.on("moveend", () => setState("bounds", map.getBounds()));
    });

    return <div ref={mapContainer} class={styles["map-container"] + " " + styles[state.baseLayer]} ></div>
}
