import React, {useState} from 'react'
import {useMediaQuery} from "@mui/material";

function DeckCard({index,rotation}) {

    console.log("rotation",rotation)

    const baseStyle = {
        position: 'absolute',
        width: '60px',
        height: '90px',
        transformOrigin: 'center center',
        padding: 0,
        boxSizing: 'border-box',
        border: 'none',
        background: 'transparent',
    };
    const isMobile = useMediaQuery('(max-width: 768px)');

    return (
        <div

            style={{
                ...baseStyle,
                position: 'absolute',
                top: `calc(${index*1.2}px + 49%)`,
                left: isMobile?"75%":"55%",
                transform: `rotateY(180deg) rotateZ(${rotation})`,
                backgroundColor: '#2c5f2d',
                border: '1px solid #1a3a1b',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',

                backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,.05) 10px, rgba(255,255,255,.05) 20px)',
            }}
        >
            <div style={{
                color: '#fff',
                fontSize: 10,
                fontWeight: 'bold',
                textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                pointerEvents: 'none',
                textAlign: 'center',
            }}>
                ?
            </div>
        </div>
    )



}

export default DeckCard