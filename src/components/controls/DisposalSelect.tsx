import { courtDisposals } from "../../lib/court-disposals";
import { setState, state } from "../../store/api-ui";

export default function OutcomeSelect() {
    const outcomeKeys = Object.keys(courtDisposals) as (keyof typeof courtDisposals)[];

    return (
        <div class="small-width top-padding">
            {outcomeKeys.map(outcome => (
                <label class="switch middle">
                    <input name="crime-disposal"
                        type="checkbox"
                        checked={state.outcomes?.includes(outcome)}
                        onInput={e => {
                            const checked = e.currentTarget.checked;
                            const updated = checked
                                ? [...(state.outcomes || []), outcome]
                                : (state.outcomes || []).filter(o => o !== outcome);
                            setState("outcomes", updated);
                        }}
                    />
                    <span style={{ color: courtDisposals[outcome].colour }}>
                        &nbsp;{courtDisposals[outcome].description}
                    </span>
                </label>
            ))}
        </div>
    );
}
