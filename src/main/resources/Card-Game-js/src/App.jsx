import './App.css'
import {BrowserRouter, Routes} from "react-router-dom";
import MainLayoutRoute from "./routes/MainLayoutRoute.jsx";
import {StompContextProvider} from './Contexts/StompContext.jsx';
import {TokenContextProvider} from "./Contexts/TokenContext.jsx";
import UserContextProvider from "./Contexts/UserContext.jsx";
import {ErrorContextProvider} from "./Contexts/ErrorContext.jsx";
import {RoomsDataContextProvider} from "./Contexts/RoomsDataContext.jsx";
import Notification from "./components/Notification.jsx";
import {NotificationContextProvider} from "./Contexts/NotificationContext.jsx";
import {GameSessionContextProvider} from "./Contexts/GameSessionContext.jsx";
import {AuthSyncProvider} from "./Contexts/AuthSyncContext.jsx";


function App() {


    return (
        <>
            <ErrorContextProvider>
                <NotificationContextProvider>
                    <TokenContextProvider>
                        <RoomsDataContextProvider>
                        <UserContextProvider>
                            <StompContextProvider>
                    <AuthSyncProvider>



                                <GameSessionContextProvider>


                                        <BrowserRouter>
                                            <Routes>

                                                {MainLayoutRoute}

                                            </Routes>
                                        </BrowserRouter>

                                </GameSessionContextProvider>



                    </AuthSyncProvider>
                        </StompContextProvider>
                    </UserContextProvider>
                        </RoomsDataContextProvider>
                    </TokenContextProvider>

                </NotificationContextProvider>
            </ErrorContextProvider>


        </>
    )
}

export default App
