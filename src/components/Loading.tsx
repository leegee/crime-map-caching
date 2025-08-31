import style from './Loading.module.scss';
import { state } from '../store/api-ui';
import { Show } from 'solid-js';

export default function Loading() {
    return <Show when={state.loading}>
        <div class={style.loading} />
    </Show>
}