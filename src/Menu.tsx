import { createSignal, Match, Switch, } from "solid-js";
import style from './Menu.module.scss';
import { state } from "./store/api-ui";
import CategorySelect from './components/controls/CategorySelect';
import DateSelect from './components/controls/DateSelect';
import ThemeToggle from "./components/controls/ThemeToggle";
import Attributions from "./components/Attributions";
import OutcomeSelect from "./components/controls/DisposalSelect";
import GeoCode from "./components/controls/GeoCode";
import LabelsToggle from "./components/controls/LabelsToggle";
import OutcomesToggleAll from "./components/controls/DisposalToggleAll";
import CategoriesToggleAll from "./components/controls/CategoriesToggleAll";

export default function Menu() {
    const [expanded, setExpanded] = createSignal(true);

    const toggle = () => setExpanded(!expanded());

    return (
        <div class={'top left ' + style.container}>

            <Switch>
                <Match when={!expanded()}>
                    <div class="top-margin no-padding">
                        <button class="circle" onclick={toggle}>
                            <i>menu</i>
                        </button>
                    </div>
                </Match>

                <Match when={expanded()}>
                    <nav class={style.nav + " left small-padding no-margin " + (expanded() ? 'medium-width' : style["nav-small"])}>

                        <div class={"row top left no-padding fixed medium-width fill " + style['first-row']}>
                            <button class="transparent small" onClick={toggle}>
                                <i>close</i>
                            </button>

                            <h4 class="small">
                                Police Crime API
                            </h4>

                            <Attributions size="small" />
                        </div>

                        <div style="height: 32pt"></div>


                        <div class="row">
                            <span class="small-padding"><i>search</i></span>
                            <GeoCode />
                        </div>

                        {__INC_LABELS__ && (
                            <div class="row">
                                <span class="small-padding"><i>label</i></span>
                                <LabelsToggle />
                            </div>
                        )}

                        <div class="row">
                            <span class="small-padding">
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
                            <span class="small-padding"><i>calendar_month</i></span>
                            <DateSelect />
                        </div>

                        <div class={"row " + style["category-row"]}>
                            <span class="small-padding"><i>category</i></span>
                            <details open>
                                <summary class="no-elevate">
                                    <article class="no-padding no-elevate">
                                        <nav>
                                            <div class="small-padding max">Crime Categories</div>
                                            <i>expand_more</i>
                                            <CategoriesToggleAll />
                                        </nav>
                                    </article>
                                </summary>
                                <CategorySelect />
                            </details>
                        </div>

                        <div class={"row " + style["category-row"]}>
                            <span class="small-padding"><i>gavel</i></span>
                            <details>
                                <summary class="no-elevate">
                                    <article class="no-padding no-elevate">
                                        <nav class="flex items-center max">
                                            Court Disposals
                                            <div style="margin-left: 0.5em;">
                                            </div>
                                            <i>expand_more</i>
                                            <OutcomesToggleAll />
                                        </nav>

                                    </article>
                                </summary>
                                <OutcomeSelect />
                            </details>
                        </div>

                        <div class="row bottom" style='margin-top: auto'>
                            <span class="small-padding"><i>copyright</i></span>
                            <Attributions />
                        </div>
                    </nav>

                </Match>
            </Switch>

        </div >
    );
}
