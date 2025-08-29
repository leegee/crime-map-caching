import { CRIME_CATEGORIES } from "../../lib/types";
import { setState, state } from "../../store/api-ui";

export default function Category() {
    return (
        <div>
            <select
                value={state.category}
                onInput={e => setState("category", e.currentTarget.value as typeof CRIME_CATEGORIES[number])}
            >
                {CRIME_CATEGORIES.map(category => (
                    <option value={category}>{category}</option>
                ))}
            </select>
            <input type="checkbox"
                checked={state.clearOnCategoryChange}
                onInput={(e) => setState("clearOnCategoryChange", e.currentTarget.checked)}
            />
        </div>
    );
}
