import React from 'react'
import {Route} from "react-router-dom";
import Home from "../pages/Home.jsx";
import MainLayout from "../layoutes/MainLayout.jsx";
import About from "../pages/About.jsx";
import ProtectedRoute from "./ProtectedRoute.jsx";
import Register from "../pages/Register.jsx";
import RoomPage from "../pages/RoomPage.jsx";
import {GameSessionContext, GameSessionContextProvider} from "../Contexts/GameSessionContext.jsx";
import Game from "../pages/Game.jsx";

const MainLayoutRoute = (
    <Route path={"/"} element={<MainLayout/>}>
        <Route index element={<ProtectedRoute><Home/></ProtectedRoute>}/>
        <Route path={"about"} element={<ProtectedRoute><About/></ProtectedRoute>}/>
        <Route path={"register"} element={<Register/>}/>
        <Route path="/room/:roomId" element={<ProtectedRoute><RoomPage/></ProtectedRoute>}/>
            <Route path="/game/:gameSessionId" element={<ProtectedRoute><Game/></ProtectedRoute>}/>
    </Route>
)


export default MainLayoutRoute
