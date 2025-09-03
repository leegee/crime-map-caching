export default function Attributions() {
    let dialogRef: HTMLDialogElement | undefined;

    const openDialog = () => dialogRef?.showModal();
    const closeDialog = () => dialogRef?.close();

    return (
        <>
            <div class="field row middle">
                <button class="button small transparent" onClick={openDialog}>
                    Attributions
                </button>
            </div>

            <dialog ref={dialogRef} class="card">
                <h5>Credits</h5>
                <div class="small">
                    <p>
                        Data thanks to <a href='https://data.police.uk/docs/' target='_blank'>The Police API</a>.
                    </p>
                    <p>
                        Map renderer thanks to <a href='https://maplibre.org/maplibre-gl-js/docs/' target="_blank">Map Libre</a>.
                    </p>
                    <p>
                        Light map &copy; <a href="https://www.openstreetmap.org/copyright" target='_blank'>OpenStreetMap</a> contributors.
                    </p>
                    <p>
                        Dark map &copy; <a href="https://www.openstreetmap.org/copyright" target='_blank'>OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>.
                    </p>
                    <p>
                        Geocoding thanks to <a href="https://nominatim.openstreetmap.org" target="_blank">OpenStreetMap Nominatim</a>.
                    </p>
                    <p>
                        Coded by <a href='https://lee.goddards.space'>Lee</a>.
                    </p>
                </div>

                <nav class="right-align no-space">
                    <button class="transparent link" onClick={closeDialog}>
                        Close
                    </button>
                </nav>
            </dialog>
        </>
    );
}
