import React, {useContext} from 'react'
import useWebsocket from "../hooks/useWebsocket.js";
import {RoomsDataContext} from "../Contexts/RoomsDataContext.jsx";

function JoinRequestCard({userId, roomId, username, message}) {

    const {sendMessage} = useWebsocket()
    const {joinRequests, setJoinRequests} = useContext(RoomsDataContext);
    const responseToJoinRequest = (response) => {
        sendMessage("/app/response-to-join-request", {roomId, connectingUserId: userId, confirm: response})
        setJoinRequests((prev) => prev.filter((r) => r.username !== username))
    }

    return (
        <div>
            <h1>{username}</h1>
            {message && <span>{message}</span>}
            <button onClick={() => responseToJoinRequest(true)}>Confirm</button>
            <button onClick={() => responseToJoinRequest(false)}>Decline</button>
        </div>
    )
}

export default JoinRequestCard
