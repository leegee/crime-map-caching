import { createSignal, Match, Show, Switch, } from "solid-js";
import Category from './components/controls/Category';
import Date from './components/controls/Date';
import ThemeToggle from "./components/controls/ThemeToggle";
import { state } from "./store/api-ui";

export default function Controls() {
    const [expanded, setExpanded] = createSignal(true);

    const toggle = () => setExpanded(!expanded());

    return (
        <div class='top left' style="z-index: 100; position: absolute">
            <nav class={"m l left no-margin " + (expanded() ? 'medium-width' : 'auto')}>
                <header class="row items-center">
                    <button class="circle transparent" onclick={toggle}>
                        <i>menu</i>
                    </button>
                    <Show when={expanded()}>
                        Police API Crime Visualisation
                    </Show>
                </header>

                <div class="menu-item row">
                    <span class="small-padding" onclick={toggle}>
                        <Switch>
                            <Match when={state.baseLayer === 'light'}>
                                <i>dark_mode</i>
                            </Match>
                            <Match when={state.baseLayer === 'dark'}>
                                <i>light_mode</i>
                            </Match>
                        </Switch>
                    </span>
                    <Show when={expanded()}>
                        <ThemeToggle />
                    </Show>
                </div>

                <div class="menu-item row">
                    <span class="small-padding" onclick={toggle}><i>calendar_month</i></span>
                    <Show when={expanded()}>
                        <Date />
                    </Show>
                </div>

                <div class="menu-item row">
                    <span class="small-padding" onclick={toggle}><i>category</i></span>
                    <Show when={expanded()}>
                        <Category />
                    </Show>
                </div>


            </nav>
        </div >
    );
}
