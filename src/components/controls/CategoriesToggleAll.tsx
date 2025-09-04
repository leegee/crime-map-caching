import { CRIME_CATEGORIES } from "../../lib/types";
import { setState, state } from "../../store/api-ui";

export default function CategoriesToggleAll() {
    const allSelected = () => state.categories?.length === CRIME_CATEGORIES.length;

    const toggleAll = (checked: boolean) => {
        setState("categories", checked ? [...CRIME_CATEGORIES] : []);
    };

    return (
        <label class="switch">
            <input
                name="all-categories"
                type="checkbox"
                checked={allSelected()}
                onInput={e => toggleAll(e.currentTarget.checked)}
            />
            <span>&nbsp;All</span>
        </label>
    );
}
