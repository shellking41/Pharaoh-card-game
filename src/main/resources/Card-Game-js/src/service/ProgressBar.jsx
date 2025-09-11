import React, {useContext} from 'react'
import {Box, CircularProgress} from "@mui/material";
import {StompContext} from "../Contexts/StompContext.jsx";

function ProgressBar() {

    const {connected, clientRef} = useContext(StompContext);


    return (
        <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            minHeight="100vh"
        >
            <CircularProgress/>
        </Box>)

}

export default ProgressBar
