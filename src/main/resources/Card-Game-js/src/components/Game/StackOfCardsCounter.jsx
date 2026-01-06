import React, { useContext, useEffect, useRef, useState } from 'react';
import { GameSessionContext } from "../../Contexts/GameSessionContext.jsx";
import { getPlayerPositionBySeat } from "./HungarianCard.jsx";

function StackOfCardsCounter({drawn,setDrawn}) {
    const { gameSession, playerSelf } = useContext(GameSessionContext);

    // megjelenített darabok száma, pozíció (bottom/top/left/right), láthatóság
    const [count, setCount] = useState(0);
    const [position, setPosition] = useState('bottom');
    const [visible, setVisible] = useState(false);

    const hideTimeoutRef = useRef(null);

    useEffect(() => {
        // cleanup ha komponens unmount-olódik vagy drawStack változik
        return () => {
            if (hideTimeoutRef.current) {
                clearTimeout(hideTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (drawn) return;
        const drawStack = gameSession?.gameData?.drawStack ?? {};

        const entries = Object.entries(drawStack).filter(([, v]) => Number(v) > 0);

        if (entries.length === 0) {
            // nincs több draw -> eltüntetjük animálva
            // ha már nem látható, nincs mit csinálni
            if (!visible) return;

            // leállítunk esetleges timeoutot, majd eltüntetünk egy rövid delay után
            if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
            hideTimeoutRef.current = setTimeout(() => {
                setVisible(false);
                setCount(0);
            }, 120); // 120ms lehetővé teszi a scale animációt
            return;
        }


        const [playerIdStr, value] = entries[0]; // playerId string formában
        const drawCount = Number(value) || 0;

        // keressük meg a player objektumot
        const players = gameSession?.players || [];
        const player = players.find(p => String(p.playerId) === String(playerIdStr));

        let pos = 'bottom';
        if (player && playerSelf) {
            pos = getPlayerPositionBySeat(player.seat, playerSelf.seat, players.length);
        } else {
            // ha nincs player adat, fallback bottom
            pos = 'bottom';
        }

        if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current);
            hideTimeoutRef.current = null;
        }


        setPosition(pos);
        setCount(drawCount);
        setVisible(true);


    }, [gameSession?.gameData?.drawStack, gameSession?.players, playerSelf]);

    useEffect(() => {
        if(drawn){
            setDrawn(false)
            setVisible(false)
        }
    }, [drawn]);

    // pozícióból CSS top/left számítása
    const getCoordsByPosition = (pos) => {
        switch (pos) {
            case 'top':
                return { top: '10%', left: '50%' };
            case 'left':
                return { top: '55%', left: '8%' };
            case 'right':
                return { top: '55%', left: '92%' };
            case 'bottom':
                return { top: '85%', left: '50%' }
            default:
                return { top: '45%', left: '50%' };
        }
    };

    const coords = getCoordsByPosition(position);

    return (
        <div
            aria-hidden={!visible}
            style={{
                position: 'absolute',
                top: coords.top,
                left: coords.left,
                transform: `translate(-50%, -50%) scale(${(visible && !drawn) ? 1 : 0})`,
                transition: 'transform 160ms ease, font-size 200ms ease, top 300ms ease, left 300ms ease, opacity 300ms ease',
                zIndex: 10000000,
                pointerEvents: 'none',
                fontSize: `${25 + count * 2}px`,
                fontWeight: '700',
                color: '#fff',
                textShadow: '0 1px 3px rgba(0,0,0,0.6)',
                background: position==="bottom"?'rgba(255,0,0,0.62)':'rgba(0,0,0,0.35)',
                padding: '6px 8px',
                borderRadius: '8px',
            }}
        >
            {count > 0 ? `+${count}` : null}
        </div>
    );
}

export default StackOfCardsCounter;
