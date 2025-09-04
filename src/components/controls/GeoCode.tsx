import { createSignal, Show, For } from "solid-js";
import { Portal } from "solid-js/web";
import debounce from "debounce";
import style from './GeoCode.module.scss';

const DEBCOUNCE_INPUT_MS = 500;

export type GeocodeEventDetail = {
    lat: number;
    lon: number;
};

type Suggestion = {
    display_name: string;
    lat: string;
    lon: string;
    osm_type: string;
    address: {
        road?: string;
        quarter?: string;
        city?: string;
        town?: string;
    };
};

export default function GeocodeForm() {
    let snackbarEl: HTMLDivElement | undefined;
    let inputEl: HTMLInputElement | undefined;

    const [inputAddress, setInputAddress] = createSignal("");
    const [status, setStatus] = createSignal<string | null>(null);
    const [loading, setLoading] = createSignal(false);
    const [highlightIndex, setHighlightIndex] = createSignal(-1);
    const [showDropdown, setShowDropdown] = createSignal(false);
    const [suggestions, setSuggestions] = createSignal<Suggestion[]>([]);

    const showSnackbar = (msg: string) => {
        setStatus(msg);
        snackbarEl?.classList.add("active");
        setTimeout(() => setStatus(null), 3000);
    };

    function sanitizeAddress(raw: string): string {
        let sanitized = raw.trim().replace(/\s+/g, " ");
        sanitized = sanitized.replace(/[\u0000-\u001F\u007F]/g, "");
        return sanitized;
    }

    const fetchSuggestions = debounce(async (query: string) => {
        if (!query) {
            setSuggestions([]);
            setShowDropdown(false);
            setHighlightIndex(-1);
            return;
        }

        try {
            const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
                query
            )}&format=json&addressdetails=1&limit=5&countrycodes=gb`;
            const res = await fetch(url, {
                headers: { "User-Agent": "SolidGeocoder/1.0 (cv@lee.goddards.space)" },
            });

            const data = (await res.json()) as Suggestion[];;
            const unique: Suggestion[] = Array.from(
                new Map(
                    data.map(item => [
                        `${item.address.road ?? item.display_name}-${item.address.quarter ?? ""}-${(item.address.city || item.address.town) ?? ""}`,
                        item
                    ])
                ).values());
            setSuggestions(unique);
            setShowDropdown(unique.length > 0);
            setHighlightIndex(-1);
        }
        catch (err) {
            console.error(err);
            setSuggestions([]);
            setShowDropdown(false);
        }
    }, DEBCOUNCE_INPUT_MS);

    const handleInput = (e: InputEvent) => {
        const val = (e.currentTarget as HTMLInputElement).value;
        setInputAddress(val);
        fetchSuggestions(val);
    };

    const handleSubmit = async (e: Event) => {
        e.preventDefault();
        setStatus(null);

        const address = sanitizeAddress(inputAddress());
        if (!address) {
            showSnackbar("Please enter an address or postcode.");
            return;
        }

        setLoading(true);
        try {
            const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
                address
            )}&format=json&limit=1&countrycodes=gb`;

            const res = await fetch(url, {
                headers: { "User-Agent": "SolidGeocoder/1.0 (cv@lee.goddards.space)" },
            });
            const data = await res.json();

            if (data.length) {
                const detail: GeocodeEventDetail = {
                    lat: parseFloat(data[0].lat),
                    lon: parseFloat(data[0].lon),
                };
                window.dispatchEvent(new CustomEvent<GeocodeEventDetail>("geocode", { detail }));
            } else {
                showSnackbar("No results found for " + inputAddress());
            }
        } catch (err) {
            console.error(err);
            showSnackbar("There was a problem accessing the GeoCoding service.");
        } finally {
            setLoading(false);
        }
    };

    const handleSelectSuggestion = (item: { display_name: string; lat: string; lon: string }) => {
        setInputAddress(item.display_name);
        setSuggestions([]);
        setShowDropdown(false);
        setHighlightIndex(-1);
        window.dispatchEvent(
            new CustomEvent<GeocodeEventDetail>("geocode", {
                detail: { lat: parseFloat(item.lat), lon: parseFloat(item.lon) },
            })
        );
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        const list = suggestions();
        if (!showDropdown() || list.length === 0) return;

        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                setHighlightIndex((prev) => (prev + 1) % list.length);
                break;
            case "ArrowUp":
                e.preventDefault();
                setHighlightIndex((prev) => (prev - 1 + list.length) % list.length);
                break;
            case "Enter":
                e.preventDefault();
                if (highlightIndex() >= 0 && highlightIndex() < list.length) {
                    handleSelectSuggestion(list[highlightIndex()]);
                } else {
                    handleSubmit(e);
                }
                break;
            case "Escape":
                setShowDropdown(false);
                setHighlightIndex(-1);
                break;
        }
    };

    return (
        <form class="form" onSubmit={handleSubmit} autocomplete="off">
            <Show when={status()}>
                <Portal mount={document.body}>
                    <div ref={snackbarEl} class="snackbar error">
                        {status()}
                    </div>
                </Portal>
            </Show>

            <nav class={"no-space " + style["input-container"]}>
                <div class="field border left-round small">
                    <input
                        ref={inputEl}
                        name="address"
                        type="text"
                        autocomplete="off"
                        class="input small"
                        placeholder="Enter address or postcode"
                        value={inputAddress()}
                        onInput={handleInput}
                        onKeyDown={handleKeyDown}
                        onFocus={() => setShowDropdown(suggestions().length > 0)}
                        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                    />

                    <Show when={showDropdown()}>
                        <div class={"no-round fill no-padding no-margin " + style.autocomplete}>
                            <For each={suggestions()}>
                                {(item, i) => (
                                    <div
                                        class={style["autocomplete-item"] + " " + (highlightIndex() === i() ? " primary" : "")}
                                        onClick={() => handleSelectSuggestion(item)}
                                        title={item.display_name}
                                    >
                                        {
                                            item.osm_type === 'way'
                                                ? item.address.road + ' ' + (item.address.city || item.address.town)
                                                : item.display_name
                                        }
                                    </div>
                                )}
                            </For>
                        </div>
                    </Show>
                </div>

                <button
                    type="submit"
                    class={"right-round secondary " + (loading() ? "fill" : "")}
                    disabled={loading()}
                >
                    {loading() ? (
                        <i>
                            <div class="shape loading-indicator max"></div>
                        </i>
                    ) : (
                        <i>search</i>
                    )}
                </button>
            </nav>
        </form >
    );
}
