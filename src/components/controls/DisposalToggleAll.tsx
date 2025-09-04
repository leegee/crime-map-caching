import { courtDisposals } from "../../lib/court-disposals";
import { setState, state } from "../../store/api-ui";

export default function OutcomesToggleAll() {
    const outcomeKeys = Object.keys(courtDisposals) as (keyof typeof courtDisposals)[];

    const allSelected = () => state.outcomes?.length === outcomeKeys.length;

    const toggleAll = (checked: boolean) => {
        setState("outcomes", checked ? [...outcomeKeys] : []);
    };

    return (
        <label class="switch">
            <input
                name="all-disposals"
                type="checkbox"
                checked={allSelected()}
                onInput={e => toggleAll(e.currentTarget.checked)}
            />
            <span>&nbsp;All</span>
        </label>
    );
}
