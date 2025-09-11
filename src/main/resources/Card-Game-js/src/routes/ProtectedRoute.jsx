// components/ProtectedRoute.jsx
import React, {useState} from 'react';
import {Box, Modal, CircularProgress} from "@mui/material";
import {useNavigate} from "react-router-dom";
import FormModal from "../service/FormModal.jsx";
import {useAuth} from "../hooks/useAuth.js";

function ProtectedRoute({children}) {
    const navigate = useNavigate();
    const {isAuthenticated, isLoading, login} = useAuth();
    const [loginError, setLoginError] = useState('');

    // Loading állapot
    if (isLoading) {
        return (
            <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                minHeight="100vh"
            >
                <CircularProgress/>
            </Box>
        );
    }

    // Ha nincs authentikálva, login modal
    if (!isAuthenticated) {
        const inputs = [
            {name: 'Username', type: 'text', minLength: 0},
            {name: 'Password', type: 'password', minLength: 0}
        ];

        return (
            <Modal
                open={true}
                aria-labelledby="login-modal-title"
                aria-describedby="login-modal-description"
            >
                <FormModal
                    inputs={inputs}
                    header={{text: 'Login', tag: 'h2'}}
                    onSubmit={async (data) => {
                        setLoginError('');

                        const result = await login(data.Username, data.Password);

                        if (!result.success) {
                            setLoginError(result.message || 'Login failed');
                        }
                        // Ha sikeres, akkor automatikusan bezáródik a modal
                        // mert az isAuthenticated true lesz
                    }}
                >
                    {loginError && (
                        <div style={{color: 'red', marginTop: '10px'}}>
                            {loginError}
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={() => navigate("/register")}
                        style={{
                            marginTop: '10px',
                            padding: '8px 16px',
                            backgroundColor: 'transparent',
                            border: '1px solid #ccc',
                            cursor: 'pointer'
                        }}
                    >
                        Register
                    </button>
                </FormModal>
            </Modal>
        );
    }

    return children;
}

export default ProtectedRoute;