import React, { useContext, useEffect } from 'react';
import { Box, Modal } from '@mui/material';
import FormModal from '../service/FormModal.jsx';
import { useApiCallHook } from '../hooks/useApiCallHook.js';
import { useNavigate } from 'react-router-dom';
import { ErrorContext } from '../Contexts/ErrorContext.jsx';
import styles from '../service/styles/FormModal.module.css';

function Register() {
  const navigate = useNavigate();
  const { post } = useApiCallHook();
  const { setErrorLog, errorLog } = useContext(ErrorContext);
  const inputs = [
    {
      name: 'Username',
      type: 'text',
      minLength: 5,
      errorWhen: errorLog.message === 'User with this name already exists',
    },
    { name: 'Password', type: 'password', minLength: 4, errorWhen: false },

  ];

  useEffect(() => {
    console.log(errorLog);

  }, [errorLog]);

  return (
    <>
      <FormModal
        inputs={inputs}
        buttonText={'Sign up'}
        header={{ text: 'Register', tag: 'h2' }}
        onSubmit={async (data) => {

          const response = await post('http://localhost:8080/auth/register',
            {
              username: data.Username,
              password: data.Password,
            });
          console.log(response);

          if (response && response.success) {
            navigate('/');
          }

        }}

      >
        <div className={styles.loginLinkContainer}>
          <p>You already have an account?

          </p>
          <a onClick={() => {
            navigate('/');
            setErrorLog([]);
          }}>Sign in!</a>
        </div>
      </FormModal>

    </>
  );
}

export default Register;
