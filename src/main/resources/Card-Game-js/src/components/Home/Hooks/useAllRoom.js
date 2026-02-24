import React, { useCallback, useContext, useEffect, useState } from 'react';
import { TokenContext } from "../../../Contexts/TokenContext.jsx";
import { UserContext } from "../../../Contexts/UserContext.jsx";
import { RoomsDataContext } from "../../../Contexts/RoomsDataContext.jsx";
import { useApiCallHook } from "../../../hooks/useApiCallHook.js";

function useAllRoom() {
    const { userCurrentStatus } = useContext(UserContext);
    const { token } = useContext(TokenContext);
    const { setRooms, setTotalPages, setCurrentPage } = useContext(RoomsDataContext);
    const { get } = useApiCallHook();
    const [loading, setLoading] = useState(false);
    const [pageSize] = useState(20);

    const getAllRoom = useCallback(async (pageNum = 0) => {
        setLoading(true);
        try {
            if (!userCurrentStatus.authenticated) {
                return;
            }
            const response = await get(
                `http://localhost:8080/room/all?pageNum=${pageNum}&pageSize=${pageSize}`,
                token
            );
            console.log("rooms", response);

            if (response) {
                setRooms(response.content);
                setTotalPages(response.totalPages);
                setCurrentPage(response.number);
            } else {
                throw new Error(response?.message || "failed to fetch the rooms");
            }
        } catch (e) {
            console.log(e);
        } finally {
            setLoading(false);
        }
    }, [userCurrentStatus, get, token, setRooms, setTotalPages, setCurrentPage, pageSize]);

    const goToPage = useCallback((pageNum) => {
        getAllRoom(pageNum);
    }, [getAllRoom]);

    useEffect(() => {
        getAllRoom(0);
    }, []);

    return { getAllRoom, loading, goToPage, pageSize };
}

export default useAllRoom;