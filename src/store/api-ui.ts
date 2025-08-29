import { createStore } from "solid-js/store";

export const CRIME_CATEGORIES = [
    "violent-crime",
    "burglary",
    "robbery",
    "anti-social-behaviour",
] as const;

export type CrimeCategory = typeof CRIME_CATEGORIES[number];

type StoreState = {
    date: Date;
    category: CrimeCategory;
};

const defaultDate = (): Date => {
    const now = new Date();
    const latestMonth = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    return new Date(
        latestMonth.getFullYear(),
        latestMonth.getMonth(),
        1
    );
}

export const [state, setState] = createStore<StoreState>({
    date: defaultDate(),
    category: 'violent-crime',
});

// export const getDateString = () => `${state.date.getFullYear()}-${String(state.date.getMonth() + 1).padStart(2, "0")}`;
