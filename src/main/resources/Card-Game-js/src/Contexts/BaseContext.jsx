import { createContext, useEffect, useRef, useState } from 'react';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

export const BaseContext = createContext();

// Provider komponens
export const BaseContextProvider = ({ children }) => {

  const contextValue={

  }

  return <BaseContext.Provider value={contextValue}>{children}</BaseContext.Provider>;
};
