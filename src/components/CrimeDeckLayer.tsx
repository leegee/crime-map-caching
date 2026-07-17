import { createEffect, onCleanup, onMount } from "solid-js";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { ScatterplotLayer } from "@deck.gl/layers";

import type maplibregl from "maplibre-gl";
import type { CrimeRecord } from "../lib/types";

import { crimeCategories } from "../lib/categories";

interface Props {
    map: maplibregl.Map;
    records: () => CrimeRecord[];
}

function categoryColour(category: string): [number, number, number, number] {
    const colour = crimeCategories[category as keyof typeof crimeCategories]?.colour;

    // temporary parser - we can improve this later
    if (!colour) return [128, 128, 128, 255];

    const hex = colour.replace("#", "");

    return [
        parseInt(hex.substring(0, 2), 16),
        parseInt(hex.substring(2, 4), 16),
        parseInt(hex.substring(4, 6), 16),
        255,
    ];
}

export default function CrimeDeckLayer(props: Props) {
    let overlay: MapboxOverlay;

    onMount(() => {
        overlay = new MapboxOverlay({
            interleaved: true,
            layers: [],
        });

        props.map.addControl(overlay);
    });

    createEffect(() => {
        if (!overlay) return;

        overlay.setProps({
            layers: [
                new ScatterplotLayer<CrimeRecord>({
                    id: "crime-points",

                    data: props.records(),

                    getPosition: d => [
                        d.lon,
                        d.lat,
                    ],

                    getRadius: 8,

                    getFillColor: d =>
                        categoryColour(d.category),

                    pickable: true,
                }),
            ],
        });
    });

    onCleanup(() => {
        if (overlay) {
            props.map.removeControl(overlay);
        }
    });

    return null;
}
