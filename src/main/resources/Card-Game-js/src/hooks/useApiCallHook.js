import React, { useContext } from 'react';
import { ErrorContext } from '../Contexts/ErrorContext.jsx';
import { TokenContext } from '../Contexts/TokenContext.jsx';

export const useApiCallHook = () => {
  const { setErrorLog } = useContext(ErrorContext);
  const { setToken } = useContext(TokenContext);

  const parseResponse = async (response) => {
    const contentType = response.headers.get('Content-Type');

    if (!response.ok) {
      return response;
    }

    if (contentType.includes('application/json')) {
      return await response.json();
    } else if (contentType.includes('text/')) {
      return await response.text();
    } else {
      return await response.blob();
    }
  };

  const refreshTokenCall = async () => {
    try {
      console.log('[API] Attempting token refresh due to 401...');
      const response = await fetch('http://localhost:8080/auth/refreshToken', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      if (data?.accessToken) {
        setToken(data.accessToken);
        console.log('[API] Token refreshed successfully');
        return data.accessToken;
      }
      throw new Error('No access token in refresh response');
    } catch (error) {
      console.error('[API] Token refresh failed:', error);
      setToken(null);
      return null;
    }
  };

  const get = async (url, bearer, retryCount = 0) => {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${bearer}`,
          'Content-Type': 'application/json',
        },
      });

      // 401 Unauthorized - Token refresh
      if (response.status === 401 && retryCount === 0) {
        console.log('[API] 401 detected, refreshing token...');
        const newToken = await refreshTokenCall();

        if (newToken) {
          // Retry with new token
          return await get(url, newToken, retryCount + 1);
        } else {
          // Redirect to login if refresh fails
          setErrorLog(prev => ({
            ...prev,
            error: true,
            message: 'Session expired. Please login again.',
          }));
          window.location.reload();
          return;
        }
      }

      if (!response.ok) {
        const errorData = await response.json();
        setErrorLog(prev => ({
          ...prev,
          error: true,
          message: errorData.message || 'Something went wrong',
        }));
        return;
      }

      return await parseResponse(response);
    } catch (error) {
      setErrorLog(prev => ({
        ...prev,
        error: true,
        message: error.message || 'Something went wrong',
      }));
    }
  };

  const post = async (url, data, bearer, retryCount = 0) => {
    console.log(data);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${bearer}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      // 401 Unauthorized - Token refresh
      if (response.status === 401 && retryCount === 0) {
        console.log('[API] 401 detected, refreshing token...');
        const newToken = await refreshTokenCall();

        if (newToken) {
          // Retry with new token
          return await post(url, data, newToken, retryCount + 1);
        } else {

          setErrorLog(prev => ({
            ...prev,
            error: true,
            message: 'Session expired. Please login again.',
          }));
          window.location.reload();
          return;
        }
      }

      if (!response.ok) {
        const errorData = await response.json();
        console.log(errorData);

        setErrorLog(prev => ({
          ...prev,
          error: true,
          message: errorData.message || 'Something went wrong',
        }));
      }

      return await parseResponse(response);
    } catch (error) {
      setErrorLog(prev => ({
        ...prev,
        error: true,
        message: error.message || 'Something went wrong',
      }));
    }
  };

  const put = async (url, data, bearer, retryCount = 0) => {
    try {
      const response = await fetch(url, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${bearer}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      // 401 Unauthorized - Token refresh
      if (response.status === 401 && retryCount === 0) {
        console.log('[API] 401 detected, refreshing token...');
        const newToken = await refreshTokenCall();

        if (newToken) {
          // Retry with new token
          return await put(url, data, newToken, retryCount + 1);
        } else {

          setErrorLog(prev => ({
            ...prev,
            error: true,
            message: 'Session expired. Please login again.',
          }));
          window.location.reload();
          return;
        }
      }

      if (!response.ok) {
        const errorData = await response.json();
        setErrorLog(prev => ({
          ...prev,
          error: true,
          message: errorData.message || 'Something went wrong',
        }));
        return;
      }

      return await parseResponse(response);
    } catch (error) {
      setErrorLog(prev => ({
        ...prev,
        error: true,
        message: error.message || 'Something went wrong',
      }));
    }
  };

  return { get, post, put };
};