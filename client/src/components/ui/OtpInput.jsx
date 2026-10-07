import React, { useMemo, useRef, useEffect } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { radii } from './Theme';

/**
 * PART 1 OtpInput — 6 separate boxes, paste the whole code, one-time-code
 * autocomplete + inputmode numeric so the phone offers the SMS code itself.
 * The tokenised copy in components/auth/OtpInput.jsx is 4 letters; this is the
 * 6-box product variant the spec asks for.
 */
export default function OtpInput({
  value = '',
  onChange,
  length = 6,
  error,
  disabled = false,
  autoFocus = true,
  placeholder = '•',
}) {
  const inputsRef = useRef([]);
  const digits = useMemo(
    () => Array.from({ length }, (_, i) => value[i] || ''),
    [value, length]
  );

  useEffect(() => {
    if (autoFocus) inputsRef.current[0]?.focus();
  }, [autoFocus]);

  const commit = (next) => onChange(next.slice(0, length));

  const handleChange = (index, raw) => {
    const typed = raw.replace(/\D/g, '').toUpperCase();
    if (!typed) return;

    const chars = value.split('');
    typed.split('').forEach((ch, offset) => {
      if (index + offset < length) chars[index + offset] = ch;
    });
    const next = chars.join('').slice(0, length);
    commit(next);

    const focusAt = Math.min(index + typed.length, length - 1);
    inputsRef.current[focusAt]?.focus();
  };

  const handleKeyDown = (index, event) => {
    if (event.key === 'Backspace') {
      event.preventDefault();
      const chars = value.split('');
      if (chars[index]) {
        chars[index] = '';
        commit(chars.join(''));
      } else if (index > 0) {
        chars[index - 1] = '';
        commit(chars.join(''));
        inputsRef.current[index - 1]?.focus();
      }
      return;
    }
    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      inputsRef.current[index - 1]?.focus();
    }
    if (event.key === 'ArrowRight' && index < length - 1) {
      event.preventDefault();
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (event) => {
    event.preventDefault();
    const pasted = event.clipboardData
      .getData('text')
      .replace(/\D/g, '')
      .toUpperCase()
      .slice(0, length);
    if (!pasted) return;
    commit(pasted);
    inputsRef.current[Math.min(pasted.length, length - 1)]?.focus();
  };

  return (
    <Box>
      <Stack
        direction="row"
        spacing={{ xs: 2, sm: 3 }}
        justifyContent="center"
        sx={{ width: '100%' }}
      >
        {digits.map((digit, index) => (
          <Box
            key={index}
            component="input"
            ref={(el) => {
              inputsRef.current[index] = el;
            }}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            onFocus={(e) => e.target.select()}
            disabled={disabled}
            inputMode="numeric"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="one-time-code"
            placeholder={placeholder}
            aria-label={`Digit ${index + 1} of ${length}`}
            sx={{
              flex: 1,
              minWidth: 0,
              maxWidth: { xs: 56, sm: 64 },
              height: { xs: 52, sm: 60 },
              textAlign: 'center',
              fontSize: { xs: '1.25rem', sm: '1.5rem' },
              fontWeight: 700,
              textTransform: 'uppercase',
              fontFamily: 'inherit',
              color: 'text.primary',
              borderRadius: `${radii.md}px`,
              border: '2px solid',
              borderColor: error ? 'error.main' : 'divider',
              backgroundColor: 'background.paper',
              outline: 'none',
              transition: 'border-color .2s, box-shadow .2s',
              '&:focus': {
                borderColor: error ? 'error.main' : 'secondary.main',
                boxShadow: `0 0 0 3px ${
                  error ? 'rgba(192,64,46,0.16)' : 'rgba(0,167,157,0.18)'
                }`,
              },
              '&:disabled': {
                backgroundColor: 'background.default',
                color: 'text.secondary',
              },
            }}
          />
        ))}
      </Stack>
      {error && (
        <Typography variant="caption" sx={{ display: 'block', mt: 2, textAlign: 'center', color: 'error.main' }}>
          {error}
        </Typography>
      )}
    </Box>
  );
}
