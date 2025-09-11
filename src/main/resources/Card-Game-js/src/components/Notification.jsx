import React from 'react'
import {MdErrorOutline} from "react-icons/md";
import {GrStatusGood} from "react-icons/gr";
import {IoWarningOutline} from "react-icons/io5";

function Notification({message, type}) {
    const getIcon = () => {
        switch (type) {
            case 'success':
                return <GrStatusGood/>
            case 'warning':
                return <IoWarningOutline/>
            case 'error':
                return <MdErrorOutline/>
            default:
                return null
        }
    }

    return (
        <div>
            {getIcon()}
            <div>
                <p>{message}</p>
            </div>
        </div>
    )
}

export default Notification
