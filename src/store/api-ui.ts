import { createStore } from "solid-js/store";
import type { CrimeCategory } from "../lib/types";

type StoreState = {
    date: Date;
    categories: CrimeCategory[];
    clearOnDateChange: boolean;
    clearOnCategoryChange: boolean;
    bounds: maplibregl.LngLatBounds | null;
    loading: boolean;
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
    clearOnCategoryChange: true,
    bounds: null,
    loading: false,
});

