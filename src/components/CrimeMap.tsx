/* @refresh reset */

import "maplibre-gl/dist/maplibre-gl.css";
import styles from './CrimeMap.module.scss';

import { createEffect, createSignal, onCleanup, onMount } from "solid-js";
import maplibregl, { type ExpressionSpecification } from "maplibre-gl";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { ScatterplotLayer } from "@deck.gl/layers";

import type { CrimeCategory, CrimeRecord } from "../lib/types";
import { fetchDataForViewport } from "../lib/fetch";
import { crimeCategories } from "../lib/categories";
import { setState, state } from "../store/api-ui";
import { courtDisposals } from "../lib/court-disposals";
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

    const [deckOverlay, setDeckOverlay] = createSignal<MapboxOverlay | undefined>();
    const [mapLoaded, setMapLoaded] = createSignal(false);
    const [crimeRecords, setCrimeRecords] = createSignal<CrimeRecord[]>([]);

    let map: maplibregl.Map;

    // Keep track of last queries per category
    let lastQuery: Record<string, string> = {};

    // Light/dark basemap toggle
    createEffect(() => {
        let showLabels;
        if (__INC_LABELS__) {
            showLabels = state.showLabels;
        }
        if (state.baseLayer && mapLoaded()) {
            map.setLayoutProperty("basemap-layer-dark", "visibility", state.baseLayer === "dark" ? "visible" : "none");
            map.setLayoutProperty("basemap-layer-light", "visibility", state.baseLayer === "light" ? "visible" : "none");
            if (__INC_LABELS__) {
                map.setLayoutProperty("basemap-layer-dark-labels", "visibility", state.baseLayer === "dark" && showLabels ? "visible" : "none");
                map.setLayoutProperty("basemap-layer-light-labels", "visibility", state.baseLayer === "light" && showLabels ? "visible" : "none");
            }
        }
    });


    // When outcomes/court disposal filters are applied, update the way the mapped circles are painted
    createEffect(() => {
        if (!state.outcomes || !mapLoaded()) return;
        const strokeColor = state.outcomes.length ? buildOutcomeStrokeExpression() : "rgba(0,0,0,0)";
        const strokeWidth = state.outcomes.length ? 5 : 0;

        for (const category of Object.keys(crimeCategories) as CrimeCategory[]) {
            if (map.getLayer(`crime-${ category }`)) {
                map.setPaintProperty(`crime-${ category }`, "circle-stroke-color", strokeColor);
                map.setPaintProperty(`crime-${ category }`, "circle-stroke-width", strokeWidth);
            }
        }
    });

    // Re-render on state change - category, date, bounds
    createEffect(async () => {
        if (!state.bounds) return;

        // Filters:

        // Remove features whose categories are no longer selected
        setCrimeRecords(records =>
            records.filter(record => state.categories?.includes(record.category))
        );

        if (state.outcomes?.length) {
            setCrimeRecords(records =>
                records.filter(record => state.outcomes.includes(record.outcomeKey))
            );
        }


        const tilesToFetchPromises: Promise<void>[] = [];

        if (!state.categories?.length) return;

        setState("loading", true);

        for (const category of state.categories) {
            const lastDateKey = lastQuery[category];
            const dateKey = state.date.toISOString().slice(0, 7); // YYYY-MM
            const shouldClear = lastDateKey !== dateKey;

            if (shouldClear) {
                setCrimeRecords(records =>
                    records.filter(record => record.category !== category)
                );

                lastQuery[category] = dateKey;
            }

            // Fetch tiles for this category
            tilesToFetchPromises.push(
                fetchDataForViewport(state.bounds, state.date, category, (newCrimes: CrimeRecord[]) => {
                    const filtered = state.outcomes?.length
                        ? newCrimes.filter(crime => state.outcomes.includes(crime.outcomeKey))
                        : newCrimes;

                    setCrimeRecords(existing => [
                        ...existing,
                        ...filtered,
                    ]);
                })
            );
        }

        await Promise.all(tilesToFetchPromises).catch(err => console.error(err));
        setState("loading", false);
    });

    function handleGeocodeEvent(e: CustomEvent<GeocodeEventDetail>) {
        console.log("handleGeocodeEvent", e.detail);
        map.flyTo({
            center: [e.detail.lon, e.detail.lat],
            zoom: 16,
            speed: 1.2,
            curve: 1.42,
        });
    }

    // createEffect(() => {
    //     if (!mapLoaded()) return;

    //     const source = map.getSource("crimes") as maplibregl.GeoJSONSource | undefined;
    //     if (!source) return;

    //     source.setData({
    //         type: "FeatureCollection",
    //         features: crimeRecords().map(crimeRecordToFeature),
    //     });
    // });

    createEffect(() => {
        const overlay = deckOverlay();
        if (!overlay) return;

        overlay.setProps({
            layers: [
                new ScatterplotLayer<CrimeRecord>({
                    id: "crime-points",
                    data: crimeRecords(),
                    getPosition: d => [
                        d.lon,
                        d.lat,
                    ],
                    getRadius: 10,
                    radiusUnits: "meters",
                    getFillColor: d => {
                        return [
                            ...crimeCategories[d.category].colour,
                            200,
                        ];
                    },
                    pickable: true,
                    autoHighlight: true,
                    highlightColor: [255, 255, 255, 80],

                    onClick: info => {
                        if (!info.object) return;
                        const crime = info.object as CrimeRecord;
                        popup?.remove();
                        popup = new maplibregl.Popup({
                            closeButton: false,
                        })
                            .setLngLat([
                                crime.lon,
                                crime.lat,
                            ])
                            .setHTML(`
                                <article class="primary-container no-elevate no-padding">
                                    <table>
                                        <tr>
                                            <th>Street</th>
                                            <td>${ crime.streetName }</td>
                                        </tr>
                                        <tr>
                                            <th>Category</th>
                                            <td>${ crimeCategories[crime.category].description }</td>
                                        </tr>
                                        <tr>
                                            <th>Outcome</th>
                                            <td>${ crime.outcome }</td>
                                        </tr>
                                        <tr>
                                            <th>Month</th>
                                            <td>${ crime.month }</td>
                                        </tr>
                                        <tr>
                                            <th>Context</th>
                                            <td>${ crime.context || "None provided" }</td>
                                        </tr>
                                    </table>
                                </article>
                    `)
                            .addTo(map!);
                    },
                }),
            ],
        });
    });

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

        // For mobile:
        map.dragPan.enable();
        map.scrollZoom.enable();
        map.doubleClickZoom.enable();
        map.touchZoomRotate.enable({ around: "center" });

        map.dragRotate.disable();
        map.touchZoomRotate.disableRotation();

        map.on("load", () => {
            const overlay = new MapboxOverlay({
                interleaved: true,
                layers: [],
            });
            map.addControl(overlay);
            setDeckOverlay(overlay);

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

            if (__INC_LABELS__) {
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
            }

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

            if (__INC_LABELS__) {
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
            }

            setState("bounds", map.getBounds());
            setMapLoaded(true);
        });

        map.on("moveend", () => setState("bounds", map.getBounds()));
    });

    return <div ref={mapContainer} class={styles["map-container"] + " " + styles[state.baseLayer]} ></div>
}

