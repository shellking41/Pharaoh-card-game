import React, {useContext, useEffect, useState} from 'react';
import styles from './Style/NewRoundNotification.module.css';
import {GameSessionContext} from "../../Contexts/GameSessionContext.jsx";

function NewRoundNotification({ isVisible, onAnimationComplete,lossIncreased, setLossIncreased}) {
    const [shouldRender, setShouldRender] = useState(false);
    const {playerSelf,gameSession}=useContext(GameSessionContext)



    useEffect(() => {
        if (isVisible) {
            setShouldRender(true);
        }
    }, [isVisible]);
    useEffect(() => {
        console.log("lossIncreased",lossIncreased)

    }, [lossIncreased]);

    const handleAnimationEnd = () => {
        if (isVisible) {

            setTimeout(() => {
                setShouldRender(false);
                onAnimationComplete?.();
                setLossIncreased(false)
            }, 2000);
        }
    };

    if (!shouldRender) return null;

    return (
        <div
            className={`${styles.newRoundContainer} ${isVisible ? styles.animate : styles.hide}`}
            onAnimationEnd={handleAnimationEnd}

        >
            <div className={styles.newRoundText}  style={
                {
                    backgroundColor:lossIncreased ?"red":""
                }
            }>
                <span className={styles.mainText}>NEW ROUND</span>
                <span className={styles.subText}>Get Ready!</span>
            </div>
        </div>
    );
}

export default NewRoundNotification;