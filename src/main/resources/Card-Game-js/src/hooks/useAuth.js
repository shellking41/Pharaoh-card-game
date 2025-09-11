// hooks/useAuth.js
import {useState, useEffect, useContext, useCallback} from 'react';
import {TokenContext} from '../Contexts/TokenContext.jsx';
import {UserContext} from '../Contexts/UserContext.jsx';
import {useApiCallHook} from './useApiCallHook.js';
import {GameSessionContext} from "../Contexts/GameSessionContext.jsx";

export const useAuth = () => {
    const {token, setToken} = useContext(TokenContext);
    const {userCurrentStatus, setUserCurrentStatus} = useContext(UserContext);
    const {setGameSession,setPlayerSelf}=useContext(GameSessionContext);
    const {get,post} = useApiCallHook();
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Token lejáratának ellenőrzése (JWT decode nélkül, becsléssel)
    const isTokenExpiringSoon = useCallback((token) => {

        if (!token) return true;

        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const now = Date.now() / 1000;


            // Ha 5 percen belül lejár, akkor frissíteni kell
            return payload.exp - now < 300;
        } catch {
            return true;
        }
    }, []);

    // Token frissítése
    const refreshToken = useCallback(async () => {


        if (isRefreshing) return null;
        console.log("refresh")
        setIsRefreshing(true);
        try {
            const response = await post('http://localhost:8080/auth/refreshToken');

            if (response?.accessToken) {
                setToken(response.accessToken);
                return response.accessToken;
            }
            throw new Error('No access token received');
        } catch (error) {

            // Ha a refresh token is lejárt, kijelentkeztetjük
            await logout();
            return null;
        } finally {
            setIsRefreshing(false);
        }
    }, [post, token, isRefreshing]);

    // User status lekérdezése
    const getCurrentStatus = useCallback(async (token = token) => {
        console.log("getCurrentStatus")


        if (!token) return null;

        try {
            const userStatus = await post('http://localhost:8080/user/current-status', {token});
            console.log(token);

            if (userStatus?.authenticated) {
                const currentAndManagedRoom=await post('http://localhost:8080/room/current-and-managed-room',{currentRoomId:userStatus?.currentRoomId,managedRoomId:userStatus?.managedRoomId}, token)
                const userStatusWRooms={
                    userInfo:userStatus?.userInfo,
                    authenticated:userStatus?.authenticated,
                    currentRoom:currentAndManagedRoom?.currentRoom,
                    managedRoom:currentAndManagedRoom?.managedRoom
                }
                setUserCurrentStatus(userStatusWRooms);
                await getGameSession(token,userStatusWRooms);
                return userStatusWRooms;
            }
            throw new Error('User not authenticated');
        } catch (error) {
            console.error('Get current status failed:', error);
            setUserCurrentStatus(prev => ({...prev, authenticated: false}));
            return null;
        }
    }, [post, token, setUserCurrentStatus]);

    const getGameSession=async (token,userStatusWRooms)=>{

        console.log(token)

        if (!token) return null;

        try {
            const gameSession = await get('http://localhost:8080/game/state', token);
            console.log(gameSession)

            if (gameSession) {
                setGameSession(gameSession)
                console.log(gameSession?.players,userStatusWRooms.userInfo.userId)

                setPlayerSelf(gameSession?.players.find((p)=>p.userId===userStatusWRooms.userInfo.userId))
            }

        } catch (error) {
            console.error('Get game session failed:', error);
        }
    }

    // Bejelentkezés
    const login = useCallback(async (username, password) => {

        try {
            const response = await post('http://localhost:8080/auth/login', {
                username,
                password
            });

            if (response?.status.success && response?.accessToken) {
                setToken(response.accessToken);


                //userhez tartozo szobak lekerese
                const currentAndManagedRoom=await post('http://localhost:8080/room/current-and-managed-room',{currentRoomId:response.userCurrentStatus?.currentRoomId,managedRoomId:response.userCurrentStatus?.managedRoomId}, response.accessToken)

                if(currentAndManagedRoom){
                    const userStatusWRooms={
                        userInfo:response.userCurrentStatus?.userInfo,
                        authenticated:response.userCurrentStatus?.authenticated,
                        currentRoom:currentAndManagedRoom?.currentRoom,
                        managedRoom:currentAndManagedRoom?.managedRoom
                    }
                    setUserCurrentStatus(userStatusWRooms);
                }



                return {success: true};
            }
            throw new Error(response?.message || 'Login failed');
        } catch (error) {
            console.error('Login failed:', error);
            return {success: false, message: error.message};
        }
    }, [post,get, token, setUserCurrentStatus]);

    // Kijelentkezés
    const logout = useCallback(async () => {

        try {
            // if (token) {
            //     await post('http://localhost:8080/auth/logout', {}, token);
            // }
        } catch (error) {
            console.error('Logout request failed:', error);
        } finally {
            setToken(null);
            setUserCurrentStatus({
                userInfo: {
                    userId: "",
                    username: "",
                    role: "",
                },
                currentRoom: {
                    roomId: "",
                    roomName: "",
                    participants: []
                },
                managedRoom: {
                    roomId: "",
                    roomName: "",
                    participants: []
                },
                authenticated: false,
            });
        }
    }, [post, token, setUserCurrentStatus]);

    // Automatikus token frissítés és validáció
    const ensureValidToken = useCallback(async () => {

        const currentToken = token;


        if (!currentToken) {
            setUserCurrentStatus(prev => ({...prev, authenticated: false}));
            return false;
        }

        // Ha a token hamarosan lejár, frissítjük
        if (isTokenExpiringSoon(currentToken)) {
            const newToken = await refreshToken();
            if (!newToken) return false;
        }

        // Ellenőrizzük a user status-t (csak ha még nem authenticated)
        if (!userCurrentStatus.authenticated) {
            const status = await getCurrentStatus();


            return !!status;
        }

        return true;
    }, [token, userCurrentStatus.authenticated, isTokenExpiringSoon, refreshToken, getCurrentStatus, setUserCurrentStatus]);

    useEffect(() => {


        const initAuth = async () => {

            setIsLoading(true);

            // Ha nincs access token a memóriában, próbáljuk meg refresh-elni
            if (!token) {
                console.log('No access token found, attempting refresh...');
                const newToken = await refreshToken();

                if (newToken) {
                    // Ha sikerült refresh-elni, lekérdezzük a user adatokat
                    await getCurrentStatus(newToken);
                } else {
                    // Ha nem sikerült refresh-elni, nincs valid session
                    console.log('No valid refresh token, user needs to login');
                    setUserCurrentStatus(prev => ({...prev, authenticated: false}));
                }
            } else {
                // Ha van access token, ellenőrizzük hogy valid-e
                await ensureValidToken();
            }

            setIsLoading(false);
        };

        initAuth();

    }, []); // Csak egyszer fut le, komponens mount-kor



    // Automatikus token frissítés időzítő
    useEffect(() => {
        if (!userCurrentStatus.authenticated || !token) return;

        const interval = setInterval(async () => {
            if (isTokenExpiringSoon(token)) {
                await refreshToken();
            }
        }, 20000); // 4 percenként ellenőrzi

        return () => clearInterval(interval);
    }, [userCurrentStatus.authenticated, token, isTokenExpiringSoon, refreshToken]);

    return {
        isAuthenticated: userCurrentStatus.authenticated,
        userCurrentStatus,
        isLoading,
        isRefreshing,
        login,
        logout,
        refreshToken,
        getCurrentStatus,
        ensureValidToken
    };
};