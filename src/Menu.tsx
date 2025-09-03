import { createSignal, Match, Switch, } from "solid-js";
import style from './Menu.module.scss';
import { state } from "./store/api-ui";
import CategorySelect from './components/controls/CategorySelect';
import DateSelect from './components/controls/DateSelect';
import ThemeToggle from "./components/controls/ThemeToggle";
import LabelsToggle from "./components/controls/LabelsToggle";
import Attributions from "./components/Attributions";
import OutcomeSelect from "./components/controls/DisposalSelect";
import GeoCode from "./components/controls/GeoCode";

export default function Menu() {
    const [expanded, setExpanded] = createSignal(true);

    const toggle = () => setExpanded(!expanded());

    return (
        <div class={'top left ' + style.container}>

            <Switch>
                <Match when={!expanded()}>
                    <div class="top-padding">
                        <button onclick={toggle}>
                            <i>menu</i>
                        </button>
                    </div>
                </Match>

                <Match when={expanded()}>
                    <nav class={style.nav + " left no-padding no-margin " + (expanded() ? 'medium-width' : style["nav-small"])}>
                        <div class="row no-padding">
                            <button class="transparent small-padding large" onclick={toggle}><i>close</i></button>
                            <h4 class="small">Police Crime API</h4>
                        </div>

                        <div class="row">
                            <span class="small-padding" onclick={toggle}><i>search</i></span>
                            <GeoCode />
                        </div>

                        <div class="row">
                            <span class="small-padding" onclick={toggle}><i>label</i></span>
                            <LabelsToggle />
                        </div>

                        <div class="row">
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

                        <div class="row">
                            <span class="small-padding" onclick={toggle}><i>calendar_month</i></span>
                            <DateSelect />
                        </div>

                        <div class={"row " + style["category-row"]}>
                            <span class="small-padding" onclick={toggle}><i>category</i></span>
                            <details open>
                                <summary class="no-elevate">
                                    <article class="no-padding no-elevate">
                                        <nav>
                                            <div class="small-padding max">Crime Categories</div>
                                            <i>expand_more</i>
                                        </nav>
                                    </article>
                                </summary>
                                <CategorySelect />
                            </details>
                        </div>

                        <div class={"row " + style["category-row"]}>
                            <span class="small-padding" onclick={toggle}><i>gavel</i></span>
                            <details>
                                <summary class="no-elevate">
                                    <article class="no-padding no-elevate">
                                        <nav>
                                            <div class="small-padding max">Court Disposals</div>
                                            <i>expand_more</i>
                                        </nav>
                                    </article>
                                </summary>
                                <OutcomeSelect />
                            </details>
                        </div>

                        <hr class="small" />

                        <div class="row bottom" style='margin-top: auto'>
                            <span class="small-padding" onclick={toggle}><i>copyright</i></span>
                            <Attributions />
                        </div>
                    </nav>

                </Match>
            </Switch>

        </div >
    );
}
