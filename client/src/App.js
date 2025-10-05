import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { io } from 'socket.io-client';

import LoginPage from './components/LoginPage';
import MainApp from './components/MainApp';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import './styles/theme.css';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#1DB954', // Vert Spotify
    },
    secondary: {
      main: '#1ed760',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
});

function App() {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Initialiser la connexion Socket.IO
    // Prefer explicit server socket URL, fallback to API base URL or existing hardcoded
    const serverUrl = process.env.REACT_APP_SERVER_URL || process.env.REACT_APP_API_BASE_URL;
    const newSocket = io(serverUrl);
    setSocket(newSocket);

    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, []);

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <AuthProvider>
        <SocketProvider socket={socket}>
          <Router>
            <div className="App app-shell">
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/" element={<MainApp />} />
              </Routes>
            </div>
          </Router>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
