import { createEffect, createSignal, Match, Show, Switch } from "solid-js";
import { Portal } from "solid-js/web";

export type GeocodeEventDetail = {
    lat: number;
    lon: number;
}

/**
 * 
 * @emits `geocode: GeocodeEventDetail `
 */
export default function GeocodeForm() {
    let snackbarEl: HTMLInputElement | undefined;
    const [inputAddress, setInputAddress] = createSignal("");
    const [status, setStatus] = createSignal<string | null>(null);
    const [loading, setLoading] = createSignal(false);

    createEffect(() => {
        const stat = status();
        if (stat) {
            snackbarEl?.classList.add('active');
            if (stat) {
                const timer = setTimeout(() => setStatus(null), 3000);
                return () => clearTimeout(timer);
            }

        } else {
            snackbarEl?.classList.remove('active');
        }
    })

    function sanitizeAddress(raw: string): string {
        let sanitized = raw.trim().replace(/\s+/g, " ");
        sanitized = sanitized.replace(/[\u0000-\u001F\u007F]/g, "");
        return sanitized;
    }

    const handleSubmit = async (e: Event) => {
        e.preventDefault();
        setStatus(null);

        const address = sanitizeAddress(inputAddress());

        if (!address) {
            setStatus("Please enter an address or postcode.");
            return;
        }

        setLoading(true);

        try {
            const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
                address
            )}&format=json&limit=1&countrycodes=gb`;

            const res = await fetch(url, {
                headers: { "User-Agent": "Thanks from SolidGeocoder/1.0 (cv@lee.goddards.space)" },
            });

            const data = await res.json();

            if (data.length) {
                const detail: GeocodeEventDetail = {
                    lat: data[0].lat,
                    lon: data[0].lon
                };
                window.dispatchEvent(new CustomEvent<GeocodeEventDetail>("geocode", { detail }));
            } else {
                setStatus("No results found for " + inputAddress());
            }
        } catch (err) {
            console.error(err);
            setStatus("There was a problem accessing the GeoCoding service.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form class="form" onSubmit={handleSubmit}>

            <Show when={status()}>
                <Portal mount={document.body}>
                    <div ref={snackbarEl} class="snackbar error">
                        {status()}
                    </div>
                </Portal>
            </Show>

            <nav class="no-space">
                <div class="max field border left-round small">
                    <input name="address"
                        autocomplete="true"
                        class="input small"
                        type="text"
                        placeholder="Enter address or postcode"
                        value={inputAddress()}
                        onInput={(e) => setInputAddress(e.currentTarget.value)}
                    />
                </div>
                <button type="submit" class={"right-round secondary "
                    + (loading() ? 'fill' : '')
                } disabled={loading()}>
                    <Switch>
                        <Match when={loading()}>
                            <i>
                                <div class="shape loading-indicator max"></div>
                            </i>
                        </Match>
                        <Match when={!loading()}>
                            <i>search</i>
                        </Match>
                    </Switch>
                </button>
            </nav>

        </form>
    );
}
