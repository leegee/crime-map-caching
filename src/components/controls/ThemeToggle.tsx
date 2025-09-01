import { Match, Switch } from "solid-js"
import { state, setState } from "../../store/api-ui"

export default function ThemeToggle() {
    return (
        <div class="field row middle">
            <label class="switch">
                <input
                    type="checkbox"
                    checked={state.baseLayer === "light"}
                    onInput={e => setState("baseLayer", state.baseLayer === 'dark' ? "light" : "dark")}
                />
                <span>
                    &nbsp;
                    <Switch>
                        <Match when={state.baseLayer === 'light'}>
                            Light Base
                        </Match>
                        <Match when={state.baseLayer === 'dark'}>
                            Dark Base
                        </Match>
                    </Switch>
                </span>
            </label>
        </div>
    )
}