import React, { useContext, useEffect, useState } from 'react';
import { useMediaQuery } from "@mui/material";
import { GameSessionContext } from "../../Contexts/GameSessionContext.jsx";

function PlayerNameBox({ playerName, pos, isYourTurn, playerId, seat }) {
    const { skipTurn, setSkipTurn,setSkippedPlayers,skippedPlayers } = useContext(GameSessionContext);
    const [isTurnSkipped, setIsTurnSkipped] = useState(false);
    const [isSkipped, setIsSkipped] = useState(false);


    useEffect(() => {
        if (skipTurn && skipTurn.playerId === playerId) {
            setIsTurnSkipped(true);


            const timeoutId = setTimeout(() => {
                setIsTurnSkipped(false);
                setSkipTurn(null);
            }, 800);

            return () => {
                clearTimeout(timeoutId);
            };
        } else {
            setIsTurnSkipped(false);
        }
    }, [skipTurn, playerId, setSkipTurn]);

    useEffect(() => {
        if (!skippedPlayers || skippedPlayers.length === 0) return;

        let cancelled = false;

        skippedPlayers.forEach((skippedPlayerId, index) => {
            const delay = index * 700;

            if (skippedPlayerId === playerId) {
                const timeoutId = setTimeout(() => {
                    if (cancelled) return;

                    setIsSkipped(true);

                    setTimeout(() => {
                        if (!cancelled) {
                            setIsSkipped(false);
                        }
                    }, 700);
                }, delay);
                return () => {
                    clearTimeout(timeoutId)
                }
            }
        });

        return () => {
            cancelled = true;
        };
    }, [skippedPlayers, playerId]);


    const calculatePosition = () => {
        switch (pos) {
            case 'bottom':
                return {
                    left: `calc(50%)`,
                    top: 'calc(90% - var(--card-height))',
                    rotate: '0deg',
                    transform: "translate(-50%, 50%)"
                };
            case 'top':
                return {
                    left: `calc(50%)`,
                    top: 'calc(var(--card-height)/1.4)',
                    rotate: '0deg',
                    transform: "translate(-50%, 50%)"
                };
            case 'left':
                return {
                    left: 'calc(var(--card-width) + 10px)',
                    top: `calc(50%)`,
                    rotate: '90deg',
                };
            case 'right':
                return {
                    right: 'calc(var(--card-width) + 10px)',
                    top: `calc(50%)`,
                    rotate: '270deg',
                };
        }
    };

    const getPointerStyle = () => {

        const color = isSkipped?'red': isTurnSkipped
            ? 'rgb(var(--warning-color))'
            : isYourTurn
                ? 'rgb(var(--main-color))'
                : 'rgb(var(--main-color),0.4)';

        switch (pos) {
            case 'bottom':
                return {
                    bottom: '-8px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    borderLeft: '8px solid transparent',
                    borderRight: '8px solid transparent',
                    borderTop: `8px solid ${color}`,
                };
            case 'top':
                return {
                    top: '-8px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    borderLeft: '8px solid transparent',
                    borderRight: '8px solid transparent',
                    borderBottom: `8px solid ${color}`,
                };
            case 'left':
            case 'right':
                return {
                    bottom: '-8px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    borderLeft: '8px solid transparent',
                    borderRight: '8px solid transparent',
                    borderTop: `8px solid ${color}`,
                };
        }
    };


    const backgroundColor = isSkipped?'red':isTurnSkipped
        ? 'rgb(var(--warning-color))'
        : isYourTurn
            ? 'rgb(var(--main-color))'
            : 'rgb(var(--main-color),0.4)';

    return (
        <div
            style={{
                left: calculatePosition().left,
                right: calculatePosition().right,
                top: calculatePosition().top,
                position: "absolute",
                rotate: calculatePosition().rotate,
                transform: calculatePosition().transform
            }}
        >
            <div style={{
                position: 'relative',
                backgroundColor: backgroundColor,
                color: '#ecf0f1',
                padding: '8px 16px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '600',
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                transition: 'background-color 0.3s ease, transform 0.3s ease',
                transform: isSkipped || isTurnSkipped ? 'scale(1.05)' : 'scale(1)',
            }}>
                {playerName}
                <div
                    style={{
                        position: 'absolute',
                        width: 0,
                        height: 0,
                        ...getPointerStyle()
                    }}
                />
            </div>
        </div>
    );
}

export default PlayerNameBox;