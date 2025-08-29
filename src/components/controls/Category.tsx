import { CRIME_CATEGORIES, setState, state } from "../../store/api-ui";

export default function Category() {
    return (
        <select
            value={state.category}
            onInput={e => setState("crimeCategory", e.currentTarget.value as typeof CRIME_CATEGORIES[number])}
        >
            {CRIME_CATEGORIES.map(category => (
                <option value={category}>{category}</option>
            ))}
        </select>
    );
}
