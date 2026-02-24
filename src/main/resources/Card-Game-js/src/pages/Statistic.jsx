import React, {useContext, useEffect, useState} from 'react'
import styles from "./styles/Statistics.module.css";
import {useApiCallHook} from "../hooks/useApiCallHook.js";
import {TokenContext} from "../Contexts/TokenContext.jsx";

function Statistic() {

    const [userStatistics,setUserStatistics]=useState({})
    const [globalBest,setGlobalBest]=useState({})
    const { get } = useApiCallHook();
    const { token } = useContext(TokenContext);
    useEffect(()=>{
        const f=async ()=> {
            let response = await get("http://localhost:8080/statistics/user/me", token)

            setUserStatistics(response)
             response=await get("http://localhost:8080/statistics/user/global-best", token)
            setGlobalBest(response)


        }
        f()
    },[])

    return (
        <div className={styles.container}>
            <div className={`${styles.userStatisticsContainer} ${styles.containerBase}`}>
                <h3 className={styles.playerStatHeader}>Player Statistics</h3>
                <table>
                    <tbody>
                    <tr>
                        <th>Statistics</th>
                        <th>Your</th>
                        <th>Global best</th>
                    </tr>

                    {Object.entries(userStatistics).map(([key, value]) => {
                        if (key === "userId") return null;

                        return (
                            <tr key={key}>
                                <td>{key}</td>
                                <td>{value}</td>
                                <td>{globalBest?.[key]}</td>
                            </tr>
                        );
                    })}

                    </tbody>


                </table>
            </div>

        </div>
    )
}

export default Statistic
