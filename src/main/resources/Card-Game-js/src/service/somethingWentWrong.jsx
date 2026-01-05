import React, {useEffect} from 'react'
import useWebsocket from "../hooks/useWebsocket.js";

function SomethingWentWrong() {
    const {showRefreshPrompt, handleRefresh } = useWebsocket();

    return (
        showRefreshPrompt && (
            <div style={{
                position: 'fixed',
                top: '20px',
                right: '20px',
                background: '#ff4444',
                color: 'white',
                padding: '15px 20px',
                borderRadius: '8px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                zIndex: 9999
            }}>
                <p>⚠️ A kapcsolat megszakadt</p>
                <button
                    onClick={handleRefresh}
                    style={{
                        background: 'white',
                        color: '#ff4444',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        marginTop: '10px'
                    }}
                >
                    Oldal újratöltése
                </button>
            </div>
        )
    )
}

export default SomethingWentWrong
