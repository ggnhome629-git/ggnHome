import React, { useEffect, useRef, useState } from 'react';
import { Box, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import { Bot } from 'lucide-react';
import axios from 'axios';
import { motionDuration, motionEase } from '../../theme/motion';
import { radii } from '../../theme/theme';

const userToken = localStorage.getItem('accessToken');

/**
 * Lightweight quick-question concierge embedded in the dashboard's floating
 * assistant dialog. Deliberately scoped to suggested follow-ups (no free-text
 * input) — that's the existing contract with the chatbot API.
 */
export default function Chatbot() {
  const [messages, setMessages] = useState([]);
  const [quickQuestions, setQuickQuestions] = useState([]);
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, thinking]);

  const applyOptions = (options = []) => {
    if (options.length > 3) {
      const shuffled = [...options].sort(() => 0.5 - Math.random());
      setQuickQuestions(shuffled.slice(0, 3));
    } else {
      setQuickQuestions(options);
    }
  };

  const sendMessage = async (question, parentId = null) => {
    if (!question) return;
    setMessages((prev) => [...prev, { sender: 'user', text: question }]);
    setQuickQuestions([]);
    setThinking(true);

    const payload = parentId ? { message: question, parentId } : { message: question };

    try {
      const res = await axios.post(`${process.env.REACT_APP_CHATBOT_API}`, payload, {
        withCredentials: true,
        headers: {
          ...(userToken ? { Authorization: `Bearer ${userToken}` } : {}),
        },
      });
      setMessages((prev) => [...prev, { sender: 'bot', text: res.data.reply }]);
      applyOptions(res.data.options || []);
    } catch (error) {
      setMessages((prev) => [...prev, { sender: 'bot', text: 'Error connecting to chatbot.' }]);
      setQuickQuestions([]);
    } finally {
      setThinking(false);
    }
  };

  useEffect(() => {
    const loadInitialQuestions = async () => {
      try {
        const res = await axios.get(`${process.env.REACT_APP_CHATBOT_API}/initial-questions`, {
          withCredentials: true,
          headers: {
            ...(userToken ? { Authorization: `Bearer ${userToken}` } : {}),
          },
        });
        applyOptions(res.data.options || []);
      } catch (error) {
        console.error('Error loading initial questions:', error);
      }
    };
    loadInitialQuestions();
  }, []);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'background.paper' }}>
      <Stack
        direction="row"
        spacing={3}
        alignItems="center"
        sx={{ px: 5, py: 4, borderBottom: '1px solid', borderColor: 'divider' }}
      >
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            backgroundColor: 'secondary.main',
            color: 'common.white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Bot size={18} />
        </Box>
        <Box>
          <Typography variant="h4" sx={{ fontSize: '1rem', color: 'primary.main' }}>
            Property Assistant
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Ask about listings, sectors or pricing
          </Typography>
        </Box>
      </Stack>

      <Box ref={scrollRef} sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: 5, py: 4 }}>
        {messages.length === 0 && (
          <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', mt: 6 }}>
            Pick a question below to get started.
          </Typography>
        )}

        <Stack spacing={3}>
          {messages.map((msg, idx) => (
            <Box
              key={idx}
              component={motion.div}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: motionDuration.fast, ease: motionEase.decelerate }}
              sx={{ display: 'flex', justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start' }}
            >
              <Box
                sx={{
                  maxWidth: '80%',
                  px: 4,
                  py: 3,
                  borderRadius: `${radii.md}px`,
                  backgroundColor: msg.sender === 'user' ? 'primary.main' : 'background.default',
                  color: msg.sender === 'user' ? 'common.white' : 'text.primary',
                }}
              >
                <Typography variant="body2">{msg.text}</Typography>
              </Box>
            </Box>
          ))}

          {thinking && (
            <Stack direction="row" spacing={2} alignItems="center" sx={{ pl: 1 }}>
              <CircularProgress size={14} color="secondary" />
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Thinking…
              </Typography>
            </Stack>
          )}
        </Stack>
      </Box>

      {quickQuestions.length > 0 && (
        <Stack
          direction="row"
          spacing={2}
          useFlexGap
          flexWrap="wrap"
          sx={{ px: 5, py: 4, borderTop: '1px solid', borderColor: 'divider' }}
        >
          {quickQuestions.map((q, idx) => (
            <Chip
              key={idx}
              label={q.question}
              onClick={() => sendMessage(q.question, q.id)}
              sx={{
                backgroundColor: 'background.default',
                '&:hover': { backgroundColor: 'secondary.main', color: 'common.white' },
              }}
            />
          ))}
        </Stack>
      )}
    </Box>
  );
}
