import React, {useContext} from 'react';
import {ErrorContext} from "../Contexts/ErrorContext.jsx";

export const useApiCallHook = () => {
    const {setErrorLog} = useContext(ErrorContext);

    const parseResponse = async (response) => {
        const contentType = response.headers.get("Content-Type");


        if (!response.ok) {
            throw new Error(`Hiba: ${response.status} ${response.statusText}`);
        }

        if (contentType.includes("application/json")) {
            return await response.json();
        } else if (contentType.includes("text/")) {
            return await response.text();
        } else {
            return await response.blob(); // pl. képek vagy fájlok esetén
        }
    };

    const get = async (url, bearer) => {
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${bearer}`,
                    'Content-Type': 'application/json'
                }
            });
            console.log(response)
            if (!response.ok) {
                const errorData = await response.json();
                setErrorLog(prev => ({
                    ...prev,
                    error: true,
                    message: errorData.message || 'Hiba történt (GET)'
                }));
                return
            }


            return await parseResponse(response);
        } catch (error) {
            setErrorLog(prev => ({
                ...prev,
                error: true,
                message: error.message || 'Hálózati hiba (GET)'
            }));
        }
    };

    const post = async (url, data, bearer) => {
        console.log(data)

        try {
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    'Authorization': `Bearer ${bearer}`,
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const errorData = await response.json();


                setErrorLog(prev => ({
                    ...prev,
                    error: true,
                    message: errorData.message || 'Hiba történt (POST)'
                }));
                return
            }

            return await parseResponse(response);
        } catch (error) {

            setErrorLog(prev => ({
                ...prev,
                error: true,
                message: error.message || 'Hálózati hiba (POST)'
            }));
        }
    };

    const put = async (url, data) => {
        try {
            const response = await fetch(url, {
                method: "PUT",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const errorData = await response.json();
                setErrorLog(prev => ({
                    ...prev,
                    error: true,
                    message: errorData.message || 'Hiba történt (PUT)'
                }));
                return
            }

            return await parseResponse(response);
        } catch (error) {
            setErrorLog(prev => ({
                ...prev,
                error: true,
                message: error.message || 'Hálózati hiba (PUT)'
            }));
        }
    };

    return {get, post, put};
};