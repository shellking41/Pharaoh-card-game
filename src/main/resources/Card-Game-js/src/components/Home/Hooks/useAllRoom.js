import React, {useCallback, useContext, useEffect, useState} from 'react'
import {TokenContext} from "../../../Contexts/TokenContext.jsx";
import {UserContext} from "../../../Contexts/UserContext.jsx";
import {RoomsDataContext} from "../../../Contexts/RoomsDataContext.jsx";
import {useApiCallHook} from "../../../hooks/useApiCallHook.js";


function useAllRoom() {
    const {userCurrentStatus} = useContext(UserContext);
    const {token} = useContext(TokenContext);
    const {setRooms} = useContext(RoomsDataContext);
    const {get} = useApiCallHook();
    const [loading, setLoading] = useState(false);

    const getAllRoom =  useCallback(async () => {
        setLoading(true);
        try {
            if (!userCurrentStatus.authenticated) {
                return
            }
            const response = await get("http://localhost:8080/room/all", token)
            if (response) {


                setRooms(response.content);
            } else {
                throw new Error(response?.message || "failed to fetch the rooms")
            }
        } catch (e) {
            console.log(e);

        }finally {
            setLoading(false);
        }


    }, [userCurrentStatus,get, token, setRooms]);


    useEffect(() => {


        getAllRoom();


    }, []);
    return{getAllRoom}
}

export default useAllRoom