import styles from './Category.module.scss';
import Category from './Category';
import Date from './Date';

export default function Controls() {
    return <section class={styles.Controls}>
        <Category />
        <Date />
    </section>
}
