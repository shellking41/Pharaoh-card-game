import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import {createTheme, ThemeProvider} from "@mui/material";

const theme = createTheme({
    palette: {
        mode: 'light', // vagy 'light'
        primary: {
            main: '#22C968',
        },
        secondary: {
            main: '#272D2D',
        },
        background: {
            default: '#FFFFFF',
            paper: '#EDF5FC'
        }
    },
    typography: {
        fontFamily: 'Roboto, serif',
        h1: {
            fontWeight: 700,
        },
        h2: {
            fontWeight: 600,
        },
    },
})


createRoot(document.getElementById('root')).render(
    // <StrictMode>
    <ThemeProvider theme={theme}>
        <App/>
    </ThemeProvider>
    // </StrictMode>,
)
