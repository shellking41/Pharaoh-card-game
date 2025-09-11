import React, {createContext, useState} from 'react'

export const UserContext = createContext();

// Provider komponens
export const UserContextProvider = ({children}) => {

    const [userCurrentStatus, setUserCurrentStatus] = useState({
        userInfo: {
            userId: "",
            username: "",
            role: "",
        },
        currentRoom: {
            roomId: "",
            roomName: "",
            playerCount:0,
            participants: [],
            bots:[]
        },
        managedRoom: {
            roomId: "",
            roomName: "",
            playerCount:0,
            participants: [],
            bots:[]
        },
        authenticated: false,
    })
    const contextValue = {userCurrentStatus: userCurrentStatus, setUserCurrentStatus: setUserCurrentStatus}

    return <UserContext.Provider value={contextValue}>{children}</UserContext.Provider>;
};
export default UserContextProvider
