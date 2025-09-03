import { state, setState } from "../../store/api-ui"

export default function LabelsToggle() {
    return (
        <div class="field row middle">
            <label class="switch">
                <input name="map-labels"
                    type="checkbox"
                    checked={state.showLabels}
                    onInput={() => setState("showLabels", !state.showLabels)}
                />
                <span>
                    &nbsp;
                    Map Labels
                </span>
            </label>
        </div>
    )
}