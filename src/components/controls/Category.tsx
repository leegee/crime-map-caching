import { CRIME_CATEGORIES } from "../../lib/types";
import { setState, state } from "../../store/api-ui";

export default function CategorySelect() {
    return (
        <div class="field row middle small-width">
            <select
                class="input no-padding"
                multiple
                value={state.categories} // array of selected categories
                onInput={e => {
                    const selected = Array.from(e.currentTarget.selectedOptions).map(opt => opt.value as typeof CRIME_CATEGORIES[number]);
                    setState("categories", selected);
                }}
            >
                {CRIME_CATEGORIES.map(category => (
                    <option value={category}>{category}</option>
                ))}
            </select>

            <label class="switch icon">
                <input type="checkbox"
                    checked={state.clearOnCategoryChange}
                    onInput={(e) => setState("clearOnCategoryChange", e.currentTarget.checked)}
                />
                <span><i>delete</i></span>
                <div class="tooltip right">Remove from the map the current date when changing category</div>
            </label>
        </div>
    );
}
