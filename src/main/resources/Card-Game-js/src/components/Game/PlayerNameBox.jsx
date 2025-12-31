import React, {useEffect} from 'react'
import {useMediaQuery} from "@mui/material";

function PlayerNameBox({playerName, pos,isYourTurn}) {
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
    }

    const getPointerStyle = () => {
        switch (pos) {
            case 'bottom':
                return {
                    bottom: '-8px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    borderLeft: '8px solid transparent',
                    borderRight: '8px solid transparent',
                    borderTop: `8px solid ${isYourTurn?'rgb(var(--main-color))':'rgb(var(--main-color),0.4)'}`,
                };
            case 'top':
                return {
                    top: '-8px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    borderLeft: '8px solid transparent',
                    borderRight: '8px solid transparent',
                    borderBottom: `8px solid ${isYourTurn?'rgb(var(--main-color))':'rgb(var(--main-color),0.4)'}`,
                };
            case 'left':
                return {
                    bottom: '-8px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    borderLeft: '8px solid transparent',
                    borderRight: '8px solid transparent',
                    borderTop: `8px solid ${isYourTurn?'rgb(var(--main-color))':'rgb(var(--main-color),0.4)'}`,
                };
            case 'right':
                return {
                    bottom: '-8px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    borderLeft: '8px solid transparent',
                    borderRight: '8px solid transparent',
                    borderTop: `8px solid ${isYourTurn?'rgb(var(--main-color))':'rgb(var(--main-color),0.4)'}`,
                };
        }
    }
    return (
        <div
            style={{
                left: calculatePosition().left,
                right:calculatePosition().right,
                top: calculatePosition().top,
                position: "absolute",
                rotate: calculatePosition().rotate,
                transform: calculatePosition().transform
            }}
        >
            <div style={{
                position: 'relative',
                backgroundColor: isYourTurn?'rgb(var(--main-color))':'rgb(var(--main-color),0.4)',
                color: '#ecf0f1',
                padding: '8px 16px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '600',
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                fontFamily: 'system-ui, -apple-system, sans-serif'
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
    )
}

export default PlayerNameBox