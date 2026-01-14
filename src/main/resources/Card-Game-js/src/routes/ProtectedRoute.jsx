import React, { useContext, useState } from 'react';
import { Box, Modal, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import FormModal from '../service/FormModal.jsx';
import { useAuth } from '../hooks/useAuth.js';
import styles from './styles/ProtectedRoute.module.css';
import { ErrorContext } from '../Contexts/ErrorContext.jsx';

function ProtectedRoute({ children }) {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, login } = useAuth();
  const [loginError, setLoginError] = useState('');
  const { setErrorLog } = useContext(ErrorContext);

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
      { name: 'Username', type: 'text', minLength: 0 },
      { name: 'Password', type: 'password', minLength: 0 },
    ];

    return (
      <Modal
        open={true}
        aria-labelledby="login-modal-title"
        aria-describedby="login-modal-description"
      >
        <FormModal
          inputs={inputs}
          buttonText={'Sign in'}
          header={{ text: 'Login', tag: 'h2' }}
          onSubmit={async (data) => {
            setLoginError('');

            const result = await login(data.Username, data.Password);
            console.log(result);

            if (!result.success) {
              setLoginError(result.message || 'Login failed');
            }
            // Ha sikeres, akkor automatikusan bezáródik a modal
            // mert az isAuthenticated true lesz
          }}
        >
          <div className={styles.registerLinkContainer}>
            <p>Don't have a user account?</p>
            <a onClick={() => {
              navigate('/register');

              setErrorLog({ error: false, message: '' });
            }}>Sign up!</a>
          </div>
        </FormModal>
      </Modal>
    );
  }

  return children;
}

export default ProtectedRoute;