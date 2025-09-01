import { state, setState } from "../../store/api-ui"

export default function ThemeToggle() {
    return (
        <div class="field row middle">
            <label class="switch">
                <input
                    type="checkbox"
                    checked={state.baseLayer === "light"}
                    onInput={() => setState("baseLayer", state.baseLayer === 'dark' ? "light" : "dark")}
                />
                <span>
                    &nbsp;
                    Toggle map colour
                </span>
            </label>
        </div>
    )
}