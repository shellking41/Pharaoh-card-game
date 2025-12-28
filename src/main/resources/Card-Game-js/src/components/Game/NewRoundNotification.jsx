import React, { useEffect, useState } from 'react';
import styles from './Style/NewRoundNotification.module.css';

function NewRoundNotification({ isVisible, onAnimationComplete }) {
    const [shouldRender, setShouldRender] = useState(false);

    useEffect(() => {
        if (isVisible) {
            setShouldRender(true);
        }
    }, [isVisible]);

    const handleAnimationEnd = () => {
        if (isVisible) {

            setTimeout(() => {
                setShouldRender(false);
                onAnimationComplete?.();
            }, 2000);
        }
    };

    if (!shouldRender) return null;

    return (
        <div
            className={`${styles.newRoundContainer} ${isVisible ? styles.animate : styles.hide}`}
            onAnimationEnd={handleAnimationEnd}
        >
            <div className={styles.newRoundText}>
                <span className={styles.mainText}>NEW ROUND</span>
                <span className={styles.subText}>Get Ready!</span>
            </div>
        </div>
    );
}

export default NewRoundNotification;