import { setState, state } from "../../store/api-ui";

export default function DateInput() {
    return (
        <div class="field row middle small-width">
            <input
                class="input no-padding"
                type="month"
                value={`${state.date.getFullYear()}-${String(state.date.getMonth() + 1).padStart(2, "0")}`}
                onInput={(e) => {
                    const [year, month] = e.currentTarget.value.split("-").map(Number);
                    setState("date", new Date(year, month - 1, 1) as Date);
                }}
            />

            <label class="switch icon">
                <input
                    type="checkbox"
                    checked={state.clearOnDateChange}
                    onInput={(e) => setState("clearOnDateChange", e.currentTarget.checked)}
                />
                <span><i>delete</i></span>
                <div class="tooltip right">Remove from the map the current data when changing date</div>
            </label>
        </div>
    );
}
