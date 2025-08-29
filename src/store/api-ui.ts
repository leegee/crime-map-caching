import { createStore } from "solid-js/store";

export const CRIME_CATEGORIES = [
    "violent-crime",
    "burglary",
    "robbery",
    "anti-social-behaviour",
] as const;

export type CrimeCategory = typeof CRIME_CATEGORIES[number];

type StoreState = {
    date: string;
    crimeCategory: CrimeCategory;
};

const defaultDate = () => {
    const now = new Date();
    const latestMonth = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const defaultYear = latestMonth.getFullYear();
    const defaultMonth = String(latestMonth.getMonth() + 1).padStart(2, "0");
    return `${defaultYear}-${defaultMonth}`;
}

export const [state, setState] = createStore<StoreState>({
    date: defaultDate(),
    crimeCategory: 'violent-crime',
});
