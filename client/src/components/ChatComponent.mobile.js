import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Chip,
  InputAdornment
} from '@mui/material';
import { Send, Chat } from '@mui/icons-material';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';

const ChatComponent = () => {
  const { messages, emitChatMessage } = useSocket();
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (message.trim() && user) {
      console.log('💬 Envoi message:', message.trim());
      emitChatMessage(message.trim());
      setMessage('');
    } else {
      console.log('❌ Impossible d\'envoyer le message:', { message: message.trim(), user });
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getMessageTypeColor = (type, systemType) => {
    if (type === 'system') {
      switch (systemType) {
        case 'success': return 'success';
        case 'error': return 'error';
        case 'warning': return 'warning';
        default: return 'info';
      }
    }
    return 'primary';
  };

  const getMessageIcon = (type, systemType) => {
    if (type === 'system') {
      switch (systemType) {
        case 'success': return '✅';
        case 'error': return '❌';
        case 'warning': return '⚠️';
        default: return 'ℹ️';
      }
    }
    return '💬';
  };

  return (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Messages avec scroll optimisé mobile */}
      <Box 
        className="chat-container"
        sx={{ 
          flex: 1, 
          overflow: 'auto', 
          mb: 2,
          maxHeight: { xs: 250, sm: 280 },
          // Scrollbar mobile optimisée
          '&::-webkit-scrollbar': {
            width: { xs: 4, sm: 6 },
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderRadius: 3,
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(255, 255, 255, 0.3)',
            borderRadius: 3,
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.5)',
            },
          },
        }}
      >
        {messages && messages.length > 0 ? (
          <List dense sx={{ py: 0 }}>
            {messages.map((msg) => (
              <ListItem
                key={msg.id}
                sx={{
                  borderRadius: 1,
                  mb: { xs: 0.5, sm: 1 },
                  px: { xs: 1, sm: 2 },
                  py: { xs: 1, sm: 1.5 },
                  backgroundColor: msg.type === 'system' 
                    ? 'rgba(255, 255, 255, 0.05)' 
                    : 'rgba(29, 185, 84, 0.1)',
                  border: msg.type === 'system' 
                    ? '1px solid rgba(255, 255, 255, 0.1)' 
                    : '1px solid rgba(29, 185, 84, 0.2)',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: msg.type === 'system' 
                      ? 'rgba(255, 255, 255, 0.08)' 
                      : 'rgba(29, 185, 84, 0.15)',
                  }
                }}
              >
                {msg.type === 'user' ? (
                  <>
                    <ListItemAvatar>
                      <Avatar
                        src={msg.avatar}
                        alt={msg.user}
                        sx={{ 
                          width: { xs: 32, sm: 36 }, 
                          height: { xs: 32, sm: 36 },
                          fontSize: { xs: '0.875rem', sm: '1rem' }
                        }}
                      >
                        {msg.user.charAt(0).toUpperCase()}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: { xs: 0.5, sm: 1 },
                          flexWrap: 'wrap'
                        }}>
                          <Typography 
                            variant="body2" 
                            fontWeight="bold"
                            sx={{ 
                              fontSize: { xs: '0.8rem', sm: '0.875rem' },
                              color: 'white'
                            }}
                          >
                            {msg.user}
                          </Typography>
                          <Typography 
                            variant="caption" 
                            color="text.secondary"
                            sx={{ 
                              fontSize: { xs: '0.7rem', sm: '0.75rem' }
                            }}
                          >
                            {formatTime(msg.timestamp)}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            mt: 0.5,
                            fontSize: { xs: '0.8rem', sm: '0.875rem' },
                            lineHeight: 1.4,
                            wordBreak: 'break-word'
                          }}
                        >
                          {msg.message}
                        </Typography>
                      }
                      sx={{ ml: { xs: 1, sm: 2 } }}
                    />
                  </>
                ) : (
                  <ListItemText
                    primary={
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: { xs: 0.5, sm: 1 },
                        flexWrap: 'wrap'
                      }}>
                        <span style={{ fontSize: '16px' }}>
                          {getMessageIcon(msg.type, msg.systemType)}
                        </span>
                        <Chip
                          label="Système"
                          size="small"
                          color={getMessageTypeColor(msg.type, msg.systemType)}
                          sx={{ 
                            height: { xs: 16, sm: 18 }, 
                            fontSize: { xs: '0.6rem', sm: '0.7rem' }
                          }}
                        />
                        <Typography 
                          variant="caption" 
                          color="text.secondary"
                          sx={{ 
                            fontSize: { xs: '0.7rem', sm: '0.75rem' }
                          }}
                        >
                          {formatTime(msg.timestamp)}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          mt: 0.5,
                          fontSize: { xs: '0.8rem', sm: '0.875rem' },
                          lineHeight: 1.4,
                          wordBreak: 'break-word'
                        }}
                      >
                        {msg.message}
                      </Typography>
                    }
                  />
                )}
              </ListItem>
            ))}
            <div ref={messagesEndRef} />
          </List>
        ) : (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            height: '100%',
            textAlign: 'center',
            px: 2
          }}>
            <Chat sx={{ 
              fontSize: { xs: 40, sm: 48 }, 
              color: 'text.secondary', 
              mb: 2 
            }} />
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ 
                fontSize: { xs: '0.875rem', sm: '0.875rem' },
                mb: 0.5
              }}
            >
              Aucun message pour le moment
            </Typography>
            <Typography 
              variant="caption" 
              color="text.secondary"
              sx={{ 
                fontSize: { xs: '0.75rem', sm: '0.75rem' }
              }}
            >
              Commencez la conversation !
            </Typography>
          </Box>
        )}
      </Box>

      {/* Zone de saisie optimisée mobile */}
      <TextField
        fullWidth
        multiline
        maxRows={3}
        placeholder="Tapez votre message..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyPress={handleKeyPress}
        disabled={!user}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                onClick={handleSendMessage}
                disabled={!message.trim() || !user}
                color="primary"
                sx={{
                  width: { xs: 40, sm: 44 },
                  height: { xs: 40, sm: 44 },
                  backgroundColor: message.trim() && user 
                    ? 'rgba(29, 185, 84, 0.1)' 
                    : 'transparent',
                  '&:hover': {
                    backgroundColor: message.trim() && user 
                      ? 'rgba(29, 185, 84, 0.2)' 
                      : 'rgba(255, 255, 255, 0.05)',
                    transform: message.trim() && user ? 'scale(1.1)' : 'none',
                  },
                  '&:active': {
                    transform: 'scale(0.95)',
                  },
                  transition: 'all 0.2s ease'
                }}
              >
                <Send sx={{ 
                  fontSize: { xs: 18, sm: 20 },
                  color: message.trim() && user ? '#1DB954' : 'inherit'
                }} />
              </IconButton>
            </InputAdornment>
          ),
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            minHeight: { xs: 48, sm: 56 },
            fontSize: { xs: '0.9rem', sm: '1rem' },
            '& fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.2)',
            },
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              '& fieldset': {
                borderColor: 'rgba(255, 255, 255, 0.3)',
              },
            },
            '&.Mui-focused': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              '& fieldset': {
                borderColor: '#1DB954',
              },
            }
          },
          '& .MuiInputBase-input': {
            color: 'white',
            fontSize: { xs: '0.9rem', sm: '1rem' },
            padding: { xs: '12px 14px', sm: '16px' }
          },
          '& .MuiInputBase-input::placeholder': {
            color: 'rgba(255, 255, 255, 0.5)',
          }
        }}
      />
      
      {/* Indicateur d'état mobile friendly */}
      <Typography 
        variant="caption" 
        color="text.secondary" 
        sx={{ 
          mt: 1, 
          textAlign: 'center',
          fontSize: { xs: '0.7rem', sm: '0.75rem' },
          px: 1
        }}
      >
        {user 
          ? `Connecté en tant que ${user.display_name}`
          : 'Non connecté'
        }
      </Typography>
    </Box>
  );
};

export default ChatComponent;