import { crimeCategories } from "../../lib/categories";
import { CRIME_CATEGORIES } from "../../lib/types";
import { setState, state } from "../../store/api-ui";

export default function CategorySelect() {
    return (
        <div class="column small-width top-padding">
            {CRIME_CATEGORIES.map(category => (
                <label class="switch middle">
                    <input name="crime-category"
                        type="checkbox"
                        checked={state.categories.includes(category)}
                        onInput={e => {
                            const checked = e.currentTarget.checked;
                            const updated = checked
                                ? [...state.categories, category]
                                : state.categories.filter(c => c !== category);
                            setState("categories", updated);
                        }}
                    />
                    <span style={"color:" + crimeCategories[category].colour} >
                        &nbsp;
                        {crimeCategories[category].description}
                    </span>
                </label>
            ))
            }
        </div >
    );
}
