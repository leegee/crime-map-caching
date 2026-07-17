/* @refresh reset */

import { onMount, onCleanup } from "solid-js";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { MapboxOverlay } from "@deck.gl/mapbox";
import { ScatterplotLayer } from "@deck.gl/layers";

import styles from "./CrimeMap.module.scss";

type TestPoint = {
    position: [number, number];
};

export default function CrimeMap() {
    let mapContainer: HTMLDivElement | undefined;

    let map: maplibregl.Map | undefined;
    let deckOverlay: MapboxOverlay | undefined;


    onMount(() => {

        map = new maplibregl.Map({
            container: mapContainer!,
            center: [-0.1278, 51.5074],
            zoom: 14,

            style: {
                version: 8,
                sources: {
                    osm: {
                        type: "raster",
                        tiles: [
                            "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                        ],
                        tileSize: 256,
                    },
                },
                layers: [
                    {
                        id: "osm",
                        type: "raster",
                        source: "osm",
                    },
                ],
            },

            attributionControl: false,
        });


        deckOverlay = new MapboxOverlay({
            interleaved: false,

            layers: [
                new ScatterplotLayer<TestPoint>({
                    id: "test-point",

                    data: [
                        {
                            position: [-0.1278, 51.5074],
                        },
                    ],

                    // coordinateSystem: "lnglat",

                    getPosition: d => d.position,
                    getRadius: 500,
                    radiusUnits: "meters",
                    getFillColor: [255, 255, 0, 255],
                    pickable: true,
                }),
            ],
        });

        map.addControl(deckOverlay);

        map.flyTo({
            center: [-0.1278, 51.5074],
            zoom: 14,
        });

        console.log("deck overlay", deckOverlay);

        map.on("move", () => {
            console.log(
                "map moved",
                map!.getCenter(),
                map!.getZoom()
            );
        });

    });


    onCleanup(() => {
        deckOverlay?.finalize();
        map?.remove();
    });


    return (
        <div
            ref={mapContainer}
            class={styles["map-container"]}
        />
    );
}