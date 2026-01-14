import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { createTheme, ThemeProvider } from '@mui/material';

const theme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: '#22c968',
        },
        secondary: {
            main: '#272d2d',
        },
        background: {
            default: '#fff',
            paper: '#edf5fc',
        },
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
});

createRoot(document.getElementById('root')).render(
  // <StrictMode>
  <ThemeProvider theme={theme}>
      <App/>
  </ThemeProvider>,
  // </StrictMode>,
);
