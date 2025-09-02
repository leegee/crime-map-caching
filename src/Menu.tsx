import { createSignal, Match, Switch, } from "solid-js";
import style from './Menu.module.scss';
import { state } from "./store/api-ui";
import Category from './components/controls/Category';
import Date from './components/controls/Date';
import ThemeToggle from "./components/controls/ThemeToggle";
import LabelsToggle from "./components/controls/LabelsToggle";
import Attributions from "./components/Attributions";

export default function Menu() {
    const [expanded, setExpanded] = createSignal(true);

    const toggle = () => setExpanded(!expanded());

    return (
        <div class={'top left ' + style.container}>
            <nav class={style.nav + " m l left no-margin " + (expanded() ? 'medium-width' : style["nav-small"])}>
                <header class="row items-center">
                    <button class="circle transparent" onclick={toggle}>
                        <i>menu</i>
                    </button>
                    Police API Crime Visualisation
                </header>

                <div class="menu-item row">
                    <span class="small-padding" onclick={toggle}><i>label</i></span>
                    <LabelsToggle />
                </div>

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
                    <ThemeToggle />
                </div>

                <div class="menu-item row">
                    <span class="small-padding" onclick={toggle}><i>calendar_month</i></span>
                    <Date />
                </div>

                <div class="menu-item row">
                    <span class="small-padding" onclick={toggle}><i>category</i></span>
                    <Category />
                </div>

                <div class="menu-item row bottom" style='margin-top: auto'>
                    <span class="small-padding" onclick={toggle}><i>copyright</i></span>
                    <Attributions />
                </div>

            </nav>
        </div >
    );
}
