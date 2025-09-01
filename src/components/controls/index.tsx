import { createSignal, Show, } from "solid-js";
import Category from './Category';
import Date from './Date';

export default function Controls() {
    const [expanded, setExpanded] = createSignal(true);

    return (
        <div class='top left' style="z-index: 100; position: absolute">
            <nav class={"m l left " + (expanded() ? 'medium-width' : 'auto')}>
                <header class="row items-center">
                    <button class="circle transparent"
                        onclick={() => setExpanded(!expanded())}
                    >
                        <i>menu</i>
                    </button>
                </header>

                <div class="menu-item row">
                    <span class="small-padding"><i>category</i></span>
                    <Show when={expanded()}>
                        <Category />
                    </Show>
                </div>

                <div class="menu-item row">
                    <span class="small-padding"><i>calendar_month</i></span>
                    <Show when={expanded()}>
                        <Date />
                    </Show>
                </div>
            </nav>
        </div >
    );
}
