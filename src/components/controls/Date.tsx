import { setState, state } from "../../store/api-ui";

export default function Category() {
    return (
        <div>
            <input
                type="month"
                value={`${state.date.getFullYear()}-${String(state.date.getMonth() + 1).padStart(2, "0")}`}
                onInput={(e) => {
                    const [year, month] = e.currentTarget.value.split("-").map(Number);
                    setState("date", new Date(year, month - 1, 1));
                }}
            />

            <input type="checkbox"
                checked={state.clearOnDateChange}
                onInput={(e) => setState("clearOnDateChange", e.currentTarget.checked)}
            />
        </div>
    );
}
