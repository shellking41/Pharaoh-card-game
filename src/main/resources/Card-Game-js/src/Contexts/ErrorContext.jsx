import React, { createContext, useState } from 'react';

export const ErrorContext = createContext();

export const ErrorContextProvider = ({ children }) => {
  //  Mindig string legyen a message, SOHA ne legyen null
  const [errorLog, setErrorLog] = useState({
    error: false,
    message: '',
  });

  // Wrapper function hogy biztosítsuk a helyes formátumot
  const setErrorLogSafe = (newValue) => {
    if (typeof newValue === 'function') {
      setErrorLog(prev => {
        const updated = newValue(prev);
        return {
          error: !!updated.error,
          message: updated.message || '',
        };
      });
    } else {
      setErrorLog({
        error: !!newValue.error,
        message: newValue.message || '',
      });
    }
  };

  return (
    <ErrorContext.Provider value={{ errorLog, setErrorLog: setErrorLogSafe }}>
      {children}
    </ErrorContext.Provider>
  );
};