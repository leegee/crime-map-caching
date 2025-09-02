import { createStore } from "solid-js/store";
import type { CrimeCategory, CrimeOutcome } from "../lib/types";

type StoreState = {
    date: Date;
    categories: CrimeCategory[];
    clearOnDateChange: boolean;
    bounds: maplibregl.LngLatBounds | null;
    loading: boolean;
    baseLayer: "dark" | "light";
    showLabels: boolean;
    outcomes: CrimeOutcome[],
};

const defaultDate = (): Date => {
    const now = new Date();
    const latestMonth = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    return new Date(latestMonth.getFullYear(), latestMonth.getMonth(), 1);
};

export const [state, setState] = createStore<StoreState>({
    date: defaultDate(),
    clearOnDateChange: true,
    categories: ["violent-crime"],
    bounds: null,
    loading: false,
    baseLayer: 'dark',
    showLabels: false,
    outcomes: [],
});

