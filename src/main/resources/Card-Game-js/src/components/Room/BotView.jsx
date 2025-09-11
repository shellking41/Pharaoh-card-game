import React, {memo, useContext, useEffect, useState} from 'react'
import {NotificationContext} from "../../Contexts/NotificationContext.jsx";
import {UserContext} from "../../Contexts/UserContext.jsx";
import {TokenContext} from "../../Contexts/TokenContext.jsx";
import {useApiCallHook} from "../../hooks/useApiCallHook.js";


function BotView({ bot, roomId, difficulties }) {
    const { userCurrentStatus } = useContext(UserContext);
    const { token } = useContext(TokenContext);
    const { post } = useApiCallHook();
    const { showNotification } = useContext(NotificationContext);

    const [tempNames, setTempNames] = useState({});

    useEffect(() => {
        const initialNames = {};
        userCurrentStatus.currentRoom?.bots.forEach(bot => {
            initialNames[bot.botId] = bot.name;
        });
        setTempNames(initialNames);
    }, [userCurrentStatus.currentRoom]);

    const removeBot = async (bot) => {
        const response = await post("http://localhost:8080/bot/remove", {
            botId: bot.botId,
            roomId
        }, token);
        if (response?.success) {
            showNotification(response.message, "success");
        } else {
            showNotification(response.message, "error");
        }
    };

    const editBot = async (e, bot) => {
        let response;
        if (difficulties.includes(e.target.value)) {
            response = await post("http://localhost:8080/bot/edit", {
                name: bot.name,
                difficulty: e.target.value,
                botId: bot.botId,
                roomId: parseInt(roomId)
            }, token);
        } else {
            response = await post("http://localhost:8080/bot/edit", {
                name: e.target.value,
                difficulty: bot.difficulty,
                botId: bot.botId,
                roomId: parseInt(roomId)
            }, token);
        }

        if (response?.success) {
            showNotification(response.message, "success");
        } else {
            showNotification(response.message, "error");
        }
    };

    return (
        <div>
            <button onClick={() => removeBot(bot)}>X</button>
            <input
                value={tempNames[bot.botId] ?? ""}
                onChange={(e) =>
                    setTempNames({ ...tempNames, [bot.botId]: e.target.value })
                }
                onBlur={(e) => editBot(e, bot)}
            />
            <select
                id="difficulty"
                name="difficulty"
                value={bot.difficulty}
                onChange={(e) => editBot(e, bot)}
            >
                {difficulties.map((d) => (
                    <option key={d} value={d}>{d}</option>
                ))}
            </select>
        </div>
    );
}

export default memo(BotView);