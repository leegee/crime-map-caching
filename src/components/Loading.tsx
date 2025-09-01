import style from './Loading.module.scss';
import { state } from '../store/api-ui';
import { Show } from 'solid-js';

export default function Loading() {
    return <Show when={state.loading}>
        <progress class={style.loading + ' no-padding'}></progress>
    </Show >
}