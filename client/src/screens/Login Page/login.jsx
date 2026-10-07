import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  Divider,
  Link,
  Stack,
  Typography,
} from '@mui/material';
import {
  ArrowLeft,
  KeyRound,
  Mail,
  Phone,
  ShieldCheck,
  Smartphone,
  Check,
  AlertCircle,
  ArrowRight,
  Calendar,
  Clock,
  FileText,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '../../Context/AuthContext';
import { OtpInput } from '../../components/ui';
import { Stepper } from '../../components/ui';
import { radii, spacing, theme } from '../../components/ui/Theme';

// ============================================================
// PART 1 — LOGIN / SIGN-UP
// One field first, then a segmented choice (password / email OTP),
// a 6-box OTP screen with resend timer + fallbacks, inline
// validation, masked echo and a return-to-intent banner.
// ============================================================
export default function LoginModal() {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from || '/';
  const { fetchUser } = useAuth();
  const userToken = typeof localStorage !== 'undefined' ? localStorage.getItem('accessToken') : null;

  const [phase, setPhase] = useState('mobile'); // mobile | password | otp
  const [method, setMethod] = useState('otp'); // otp | password
  const [mobileNumber, setMobileNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [timeLeft, setTimeLeft] = useState(90);
  const [loginChannel, setLoginChannel] = useState('mobile'); // mobile | email
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState(null); // { text, type }
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showFullLoader, setShowFullLoader] = useState(false);
  const [cookiesEnabled, setCookiesEnabled] = useState(true);
  const [showCookieBanner, setShowCookieBanner] = useState(false);

  // Phone number as entered (raw), used for the echo only.
  const [rawMobile, setRawMobile] = useState('');

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // --- OTP timer -------------------------------------------------
  useEffect(() => {
    if (phase === 'otp' && timeLeft > 0) {
      const t = setTimeout(() => setTimeLeft((n) => n - 1), 1000);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [phase, timeLeft]);

  useEffect(() => {
    try {
      document.cookie = 'ggn_cookie_test=1';
      const enabled = document.cookie.includes('ggn_cookie_test=');
      document.cookie = 'ggn_cookie_test=1; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
      setCookiesEnabled(enabled);
      if (!enabled) setShowCookieBanner(true);
    } catch {
      setCookiesEnabled(false);
      setShowCookieBanner(true);
    }
  }, []);

  const formatTime = () => {
    const m = Math.floor(timeLeft / 60);
    const s = timeLeft % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const clearMessage = () => setMessage(null);
  const scheduleClear = () => {
    if (message) {
      const t = setTimeout(clearMessage, 6000);
      return t;
    }
    return null;
  };

  const completeLogin = useCallback(async () => {
    try {
      if (typeof fetchUser === 'function') {
        await fetchUser({ force: true });
        await sleep(200);
      }
    } catch (err) {
      console.warn('fetchUser after login failed:', err);
    }
    navigate(redirectTo);
  }, [fetchUser, navigate, redirectTo]);

  // ---------- mobile -> OTP request ----------------------------
  const requestMobileOtp = async (e) => {
    e?.preventDefault();
    clearMessage();
    const errors = {};
    if (!mobileNumber || mobileNumber.length !== 10) {
      errors.mobileNumber = 'Enter a valid 10-digit mobile number';
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    setSubmitting(true);
    try {
      const res = await fetch(`${process.env.REACT_APP_Base_API}/login/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileNumber }),
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setPhase('otp');
        setOtp('');
        setTimeLeft(90);
        setOtpError('');
        setMessage({ text: data.message || 'OTP sent successfully', type: 'success' });
        return;
      }
      setMessage({ text: data.message || 'Error sending OTP', type: 'error' });
    } catch {
      setMessage({ text: 'Network error. Please try again.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  // ---------- OTP verify -----------------------------------------
  const verifyOtp = async (e) => {
    e?.preventDefault();
    clearMessage();
    if (otp.length !== 6) {
      setOtpError('Enter all 6 digits');
      return;
    }
    setOtpError('');
    setSubmitting(true);
    try {
      const res = await fetch(`${process.env.REACT_APP_Base_API}/login/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileNumber, otp }),
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        if (data.accessToken) localStorage.setItem('accessToken', data.accessToken);
        setMessage({ text: 'Code verified — signing you in…', type: 'success' });
        await completeLogin();
      } else {
        setOtpError(data.message || 'OTP verification failed');
        setMessage({ text: data.message || 'OTP verification failed', type: 'error' });
      }
    } catch {
      setMessage({ text: 'Network error while verifying', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  // ---------- resend + fallbacks ---------------------------------
  const resendOtp = async () => {
    clearMessage();
    setSubmitting(true);
    try {
      const res = await fetch(`${process.env.REACT_APP_Base_API}/login/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileNumber }),
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setTimeLeft(90);
        setOtp('');
        setOtpError('');
        setMessage({ text: data.message || 'OTP resent successfully!', type: 'success' });
      } else {
        setMessage({ text: data.message || 'Error resending OTP', type: 'error' });
      }
    } catch {
      setMessage({ text: 'Network error while resending', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const requestEmailOtp = async (e) => {
    e?.preventDefault();
    clearMessage();
    const errors = {};
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      errors.email = 'Enter a valid email address';
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    setSubmitting(true);
    try {
      const res = await fetch(`${process.env.REACT_APP_Base_API}/login/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setPhase('otp');
        setOtp('');
        setTimeLeft(90);
        setOtpError('');
        setMessage({ text: data.message || 'OTP sent successfully', type: 'success' });
        return;
      }
      setMessage({ text: data.message || 'Error sending OTP', type: 'error' });
    } catch {
      setMessage({ text: 'Network error', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const sendEmailFallback = async () => {
    clearMessage();
    setSubmitting(true);
    try {
      const res = await fetch(`${process.env.REACT_APP_Base_API}/login/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileNumber, via: 'email' }),
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMessage({ text: `We emailed the same code to ${data.maskedEmail || 'your registered email'}. Check spam too.`, type: 'success' });
      } else if (data.code === 'NO_EMAIL') {
        setMessage({ text: 'This account has no email saved, so we can\'t email the code. Please try the SMS code again or contact support.', type: 'error' });
      } else {
        setMessage({ text: data.message || 'Couldn\'t email the code', type: 'error' });
      }
    } catch {
      setMessage({ text: "Couldn't email the code", type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  // ---------- password flow --------------------------------------
  const checkMobileForPassword = async (e) => {
    e?.preventDefault();
    clearMessage();
    const errors = {};
    if (!mobileNumber || mobileNumber.length !== 10) {
      errors.mobileNumber = 'Enter a valid 10-digit mobile number';
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    setSubmitting(true);
    try {
      const res = await fetch(`${process.env.REACT_APP_Base_API}/auth/check-mobile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileNumber }),
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 404) {
        setPhase('password');
        return;
      }
      setPhase(data.passwordSet ? 'password' : 'setPassword');
    } catch {
      setPhase('setPassword');
    } finally {
      setSubmitting(false);
    }
  };

  const signInWithPassword = async (e) => {
    e?.preventDefault();
    clearMessage();
    const errors = {};
    if (!password) errors.password = 'Enter your password';
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    setSubmitting(true);
    try {
      const res = await fetch(`${process.env.REACT_APP_Base_API}/login/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileNumber, password }),
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        if (data.accessToken) localStorage.setItem('accessToken', data.accessToken);
        if (data.requireEmailSetup) {
          setMessage({ text: 'Add a recovery email to keep this account safe.', type: 'info' });
          return;
        }
        setMessage({ text: 'Signing you in…', type: 'success' });
        await completeLogin();
      } else {
        setMessage({ text: data.message || 'Login failed', type: 'error' });
      }
    } catch {
      setMessage({ text: 'Network error during login', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const goBackToMobile = () => {
    setPhase('mobile');
    setMethod('otp');
    setOtp('');
    setFieldErrors({});
    setMessage(null);
  };

  const goBackToPasswordMobile = () => {
    setPhase('password');
    setMethod('password');
    setPassword('');
    setConfirmPassword('');
    setFieldErrors({});
    setMessage(null);
  };

  // ---------- return-to-intent -----------------------------------
  const isIntent = location.state?.from && location.state.from !== '/';
  const intentLabel = useMemo(() => {
    if (isIntent) {
      const p = location.state.from.split('?')[0];
      if (p.includes('/property')) return 'Continue to this property';
      if (p.includes('/visit')) return 'Continue to booking';
      if (p.includes('/preference')) return 'Continue saving this home';
      return 'Continue where you left off';
    }
    return 'Browse the site';
  }, [isIntent, location.state?.from]);

  // ---------- inline validation for the mobile number -------------
  const handleMobileChange = (e) => {
    const raw = e.target.value;
    setRawMobile(raw);
    const digits = raw.replace(/\D/g, '').slice(0, 10);
    setMobileNumber(digits);
    if (fieldErrors.mobileNumber) setFieldErrors((p) => { const n = { ...p }; delete n.mobileNumber; return n; });
  };

  const showTrustPanel = !rawMobile || rawMobile.length > 0;

  // ---------- render ---------------------------------------------
  if (showFullLoader) {
    return (
      <Box
        sx={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 5,
          backgroundColor: '#F4F7F9',
        }}
      >
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #00A79D, #22D3EE)',
            display: 'grid',
            placeItems: 'center',
            boxShadow: '0 8px 24px rgba(0,167,157,0.35)',
          }}
        >
          <Smartphone size={28} color="#fff" />
        </Box>
        <Typography variant="body1" sx={{ color: theme.palette.primary.main, fontWeight: 700 }}>
          Taking you to your account…
        </Typography>
      </Box>
    );
  }

  return (
    <>
      {/* Global toast container — one service for the whole app (PART 11). */}
      <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9998 }}>
        <Stack direction="row" spacing={2} sx={{ px: 3, pt: 2 }}>
          {message && (
            <Box
              sx={{
                maxWidth: 420,
                px: 4,
                py: 3,
                borderRadius: radii.lg,
                backgroundColor:
                  message.type === 'error'
                    ? 'rgba(239,68,68,0.10)'
                    : message.type === 'warning'
                    ? 'rgba(245,158,11,0.10)'
                    : 'rgba(16,185,129,0.10)',
                border: `1px solid`,
                borderColor:
                  message.type === 'error'
                    ? 'error.main'
                    : message.type === 'warning'
                    ? 'warning.main'
                    : 'success.main',
                color: message.type === 'error' ? '#B91C1C' : message.type === 'warning' ? '#B45309' : '#047857',
                fontWeight: 600,
                animation: 'slideIn .25s ease',
              }}
              role="alert"
            >
              {message.text}
            </Box>
          )}
        </Stack>
        <style>{`
          @keyframes slideIn {
            from { transform: translateY(-12px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          @media (prefers-reduced-motion: reduce) {
            .MuiPaper-root { animation: none !important; }
          }
        `}</style>
      </Box>

      <Box sx={{ minHeight: '100vh', position: 'relative' }}>
        {/* ===== LEFT / TOP TRUST PANEL (desktop) ================= */}
        <Box
          sx={{
            display: { xs: 'none', md: 'flex' },
            flexDirection: 'column',
            justifyContent: 'space-between',
            background: 'linear-gradient(160deg, #002244 0%, #003366 55%, #0B5C7A 100%)',
            color: '#fff',
            p: { xs: 6, md: 10 },
            position: 'relative',
            borderRadius: radii.xl,
            overflow: 'hidden',
          }}
          aria-label="Trust panel"
        >
          <Box
            sx={{
              position: 'absolute',
              right: -80,
              bottom: -80,
              width: 280,
              height: 280,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(0,167,157,0.35), transparent 70%)',
              pointerEvents: 'none',
            }}
            aria-hidden="true"
          />
          <Box
            sx={{
              position: 'absolute',
              left: -60,
              top: -60,
              width: 200,
              height: 200,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(34,211,238,0.20), transparent 70%)',
              pointerEvents: 'none',
            }}
            aria-hidden="true"
          />

          <Box sx={{ maxWidth: 420 }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.12)',
                display: 'grid',
                placeItems: 'center',
                mb: 4,
              }}
            >
              <ShieldCheck size={28} color="#22D3EE" />
            </Box>
            <Typography variant="h2" sx={{ fontWeight: 800, lineHeight: 1.2, mb: 5 }}>
              Safe, verified, Gurgaon-first.
            </Typography>
            <Stack spacing={3}>
              <Box
                sx={{
                  display: 'flex',
                  gap: 2.5,
                  alignItems: 'flex-start',
                  px: 3,
                  py: 3,
                  borderRadius: radii.lg,
                  backgroundColor: 'rgba(255,255,255,0.08)',
                }}
              >
                <Check size={22} color="#22D3EE" />
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 700, color: '#fff' }}>
                    Verified owners
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>
                    Every listing is confirmed by a real person.
                  </Typography>
                </Box>
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  gap: 2.5,
                  alignItems: 'flex-start',
                  px: 3,
                  py: 3,
                  borderRadius: radii.lg,
                  backgroundColor: 'rgba(255,255,255,0.08)',
                }}
              >
                <Check size={22} color="#22D3EE" />
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 700, color: '#fff' }}>
                    Rewards on every visit
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>
                    Points, redemptions and exclusive promos.
                  </Typography>
                </Box>
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  gap: 2.5,
                  alignItems: 'flex-start',
                  px: 3,
                  py: 3,
                  borderRadius: radii.lg,
                  backgroundColor: 'rgba(255,255,255,0.08)',
                }}
              >
                <Check size={22} color="#22D3EE" />
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 700, color: '#fff' }}>
                    No spam
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>
                    Only what you actually asked for — ever.
                  </Typography>
                </Box>
              </Box>
            </Stack>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.75)', mt: 5, maxWidth: 360 }}>
              By continuing you agree to the ggnHome terms and conditions. Your
              information is stored securely and never sold to third parties.
            </Typography>
            <Box
              sx={{
                marginTop: 6,
                px: 3,
                py: 2.5,
                borderRadius: radii.lg,
                background: 'rgba(34,211,238,0.14)',
                border: '1px solid rgba(34,211,238,0.35)',
                textAlign: 'center',
              }}
            >
              <Typography variant="overline" sx={{ color: '#22D3EE', fontWeight: 800, letterSpacing: '0.12em' }}>
                Gurgaon-first
              </Typography>
              <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600, mt: 1 }}>
                Everything you see here is live in your city.
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box sx={{ maxWidth: 480, mx: 'auto', px: { xs: 3, sm: 4 }, py: { xs: 6, md: 10 } }}>
          {/* ===== HEADER ========================================= */}
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', md: 'center' }}
            spacing={4}
            sx={{ pb: 4 }}
          >
            <Box>
              <Typography
                variant="overline"
                sx={{ color: theme.palette.secondary.main, fontWeight: 800, letterSpacing: '0.12em' }}
              >
                ggnHome
              </Typography>
              <Typography
                variant="h2"
                sx={{ color: theme.palette.primary.main, fontWeight: 800, mt: 1 }}
              >
                Welcome back
              </Typography>
              <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mt: 2 }}>
                {showTrustPanel
                  ? 'Sign in to your account to save listings, track enquiries and get matches matched to what you want.'
                  : 'Sign in to your account to keep searching.'}
              </Typography>
            </Box>

            {isIntent && (
              <Button
                variant="contained"
                startIcon={<ArrowRight size={16} />}
                onClick={() => navigate(redirectTo)}
                sx={{ borderRadius: radii.md, fontWeight: 700, px: 6 }}
              >
                {intentLabel}
              </Button>
            )}
          </Stack>

          <Divider sx={{ borderColor: 'divider', my: 5 }}>
            <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
              or
            </Typography>
          </Divider>

          <Stack spacing={4}>
            {/* ===== SEGMENTED CHOICE (part of mobile flow) ======= */}
            <Box
              sx={{
                borderRadius: radii.lg,
                border: '1px solid',
                borderColor: 'divider',
                overflow: 'hidden',
              }}
            >
              <Stepper
                steps={[
                  { key: 'a', label: 'One-time code', description: 'By SMS to your mobile' },
                  { key: 'b', label: 'Password', description: 'Traditional sign-in' },
                ]}
                activeStep={method === 'otp' ? 0 : 1}
                onStepChange={(n) => {
                  setMethod(n === 0 ? 'otp' : 'password');
                  setFieldErrors({});
                  setMessage(null);
                }}
                disableBack
                saveDraftLabel=""
              />
            </Box>

            {/* ===== OTP / EMAIL FIELD (mobile) =================== */}
            {phase === 'mobile' && (
              <motion.form
                key="mobile"
                onSubmit={      method === 'otp' ? requestMobileOtp : checkMobileForPassword}
                variants={{
                  initial: { opacity: 0, y: 12 },
                  animate: { opacity: 1, y: 0 },
                }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                sx={{ width: '100%' }}
              >
                <Box
                  sx={{
                    backgroundColor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: radii.lg,
                    p: 5,
                  }}
                >
                  {method === 'otp' ? (
                    <>
                      <Typography variant="h3" sx={{ color: theme.palette.primary.main, mb: 1 }}>
                        Sign in or sign up
                      </Typography>
                      <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb: 5 }}>
                        We'll text you a one-time code. New here? This creates your
                        account.
                      </Typography>
                      <Stack spacing={3}>
                        <Box>
                          <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontWeight: 700 }}>
                            Mobile number
                          </Typography>
                          <Box
                            component="input"
                            type="tel"
                            value={rawMobile}
                            onChange={handleMobileChange}
                            placeholder="98765 43210"
                            autoFocus
                            sx={{
                              width: '100%',
                              padding: '14px 16px',
                              borderRadius: radii.md,
                              border: '1px solid',
                              borderColor: 'divider',
                              fontFamily: 'inherit',
                              textAlign: 'center',
                              fontWeight: 700,
                              fontSize: '1.2rem',
                              color: theme.palette.text.primary,
                              outline: 'none',
                              transition: 'border-color .15s ease',
                              '&:focus': { borderColor: theme.palette.secondary.main },
                            }}
                            inputProps={{
                              inputMode: 'numeric',
                              autoComplete: 'tel',
                              maxLength: 10,
                            }}
                          />
                          {fieldErrors.mobileNumber && (
                            <Typography variant="caption" sx={{ color: 'error.main', mt: 1, display: 'block' }}>
                              {fieldErrors.mobileNumber}
                            </Typography>
                          )}
                        </Box>
                      </Stack>
                    </>
                  ) : (
                    <>
                      <Typography variant="h3" sx={{ color: theme.palette.primary.main, mb: 1 }}>
                        Enter your mobile number
                      </Typography>
                      <Stack spacing={3}>
                        <Box>
                          <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontWeight: 700 }}>
                            Mobile number
                          </Typography>
                          <Box
                            component="input"
                            type="tel"
                            value={rawMobile}
                            onChange={handleMobileChange}
                            placeholder="98765 43210"
                            autoFocus
                            sx={{
                              width: '100%',
                              padding: '14px 16px',
                              borderRadius: radii.md,
                              border: '1px solid',
                              borderColor: 'divider',
                              fontFamily: 'inherit',
                              textAlign: 'center',
                              fontWeight: 700,
                              fontSize: '1.2rem',
                              color: theme.palette.text.primary,
                              outline: 'none',
                              transition: 'border-color .15s ease',
                              '&:focus': { borderColor: theme.palette.secondary.main },
                            }}
                            inputProps={{
                              inputMode: 'numeric',
                              autoComplete: 'tel',
                              maxLength: 10,
                            }}
                          />
                        </Box>
                        <Button
                          type="button"
                          variant="outlined"
                          startIcon={<ArrowRight size={16} />}
                          onClick={() => setMethod('otp')}
                          sx={{ borderRadius: radii.md, fontWeight: 700, borderColor: theme.palette.secondary.main, color: theme.palette.secondary.main }}
                        >
                          Use one-time code instead
                        </Button>
                      </Stack>
                    </>
                  )}

                  <Button
                    type="submit"
                    fullWidth
                    loading={submitting}
                    loadingText={method === 'otp' ? 'Sending code…' : 'Checking…'}
                    sx={{ mt: 2, borderRadius: radii.md, fontWeight: 700 }}
                  >
                    {method === 'otp' ? 'Send code' : 'Continue'}
                  </Button>
                </Box>
              </motion.form>
            )}

            {/* ===== PASSWORD / SET-PASSWORD FIELDS ============== */}
            {phase === 'password' && (
              <motion.form
                key="password"
                onSubmit={signInWithPassword}
                variants={{
                  initial: { opacity: 0, y: 12 },
                  animate: { opacity: 1, y: 0 },
                }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                sx={{ width: '100%' }}
              >
                <Box
                  sx={{
                    backgroundColor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: radii.lg,
                    p: 5,
                  }}
                >
                  <Typography variant="h3" sx={{ color: theme.palette.primary.main, mb: 1 }}>
                    {phase === 'setPassword' ? 'Create a password' : 'Welcome back'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb: 5 }}>
                    {phase === 'setPassword'
                      ? `For ${mobileNumber || 'your mobile number'}`
                      : `Sign in with your password to continue.`}
                  </Typography>

                  {phase === 'setPassword' && (
                    <>
                      <Box>
                        <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontWeight: 700 }}>
                          New password
                        </Typography>
                        <Box
                          component="input"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="At least 6 characters"
                          sx={{
                            width: '100%',
                            padding: '14px 16px',
                            borderRadius: radii.md,
                            border: '1px solid',
                            borderColor: 'divider',
                            fontFamily: 'inherit',
                            color: theme.palette.text.primary,
                            outline: 'none',
                            transition: 'border-color .15s ease',
                            '&:focus': { borderColor: theme.palette.secondary.main },
                          }}
                          inputProps={{ autoComplete: 'new-password' }}
                        />
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontWeight: 700 }}>
                          Confirm password
                        </Typography>
                        <Box
                          component="input"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-enter your password"
                          sx={{
                            width: '100%',
                            padding: '14px 16px',
                            borderRadius: radii.md,
                            border: '1px solid',
                            borderColor: 'divider',
                            fontFamily: 'inherit',
                            color: theme.palette.text.primary,
                            outline: 'none',
                            transition: 'border-color .15s ease',
                            '&:focus': { borderColor: theme.palette.secondary.main },
                          }}
                          inputProps={{ autoComplete: 'new-password' }}
                        />
                      </Box>

                      {fieldErrors.password && (
                        <Typography variant="caption" sx={{ color: 'error.main', mt: 1, display: 'block' }}>
                          {fieldErrors.password}
                        </Typography>
                      )}
                      {fieldErrors.confirmPassword && (
                        <Typography variant="caption" sx={{ color: 'error.main', mt: 1, display: 'block' }}>
                          {fieldErrors.confirmPassword}
                        </Typography>
                      )}
                    </>
                  )}

                  {phase === 'password' && (
                    <>
                      <Box>
                        <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontWeight: 700 }}>
                          Password
                        </Typography>
                        <Box
                          component="input"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter your password"
                          sx={{
                            width: '100%',
                            padding: '14px 16px',
                            borderRadius: radii.md,
                            border: '1px solid',
                            borderColor: 'divider',
                            fontFamily: 'inherit',
                            color: theme.palette.text.primary,
                            outline: 'none',
                            transition: 'border-color .15s ease',
                            '&:focus': { borderColor: theme.palette.secondary.main },
                          }}
                          inputProps={{ autoComplete: 'current-password' }}
                        />
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: -2 }}>
                        <Link
                          component="button"
                          type="button"
                          variant="body2"
                          underline="hover"
                          onClick={() => {
                            setPhase('mobile');
                            setMethod('password');
                          }}
                          sx={{ color: theme.palette.secondary.main, fontWeight: 600 }}
                        >
                          Forgot password?
                        </Link>
                      </Box>
                    </>
                  )}

                  <Button
                    type="submit"
                    fullWidth
                    loading={submitting}
                    loadingText={phase === 'setPassword' ? 'Saving…' : 'Sign in'}
                    sx={{ mt: 2, borderRadius: radii.md, fontWeight: 700 }}
                  >
                    {phase === 'setPassword' ? 'Set password' : 'Sign in'}
                  </Button>
                </Box>
              </motion.form>
            )}

            {/* ===== OTP VERIFY (6 boxes) ========================= */}
            {phase === 'otp' && (
              <motion.form
                key="otp"
                onSubmit={verifyOtp}
                variants={{
                  initial: { opacity: 0, y: 12 },
                  animate: { opacity: 1, y: 0 },
                }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                sx={{ width: '100%' }}
              >
                <Box
                  sx={{
                    backgroundColor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: radii.lg,
                    p: 5,
                  }}
                >
                  <Typography variant="h3" sx={{ color: theme.palette.primary.main, mb: 1 }}>
                    Enter your code
                  </Typography>
                  <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb: 2 }}>
                    We {loginChannel === 'email' ? 'emailed' : 'texted'} a 6-digit code to{' '}
                    <Box component="strong" sx={{ color: theme.palette.primary.main }}>
                      {loginChannel === 'email'
                        ? email || 'your account email'
                        : rawMobile || '+91 ' + mobileNumber}
                    </Box>
                  </Typography>

                  <OtpInput
                    value={otp}
                    onChange={setOtp}
                    length={6}
                    error={otpError}
                    disabled={submitting}
                  />

                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{ mt: 5, flexWrap: 'wrap', gap: 2 }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        color: timeLeft === 0 ? 'error.main' : timeLeft < 20 ? 'warning.main' : 'text.secondary',
                        fontWeight: 600,
                      }}
                    >
                      {timeLeft === 0 ? 'Code expired' : `Expires in ${formatTime()}`}
                    </Typography>
                    <Button
                      type="button"
                      variant="text"
                      onClick={resendOtp}
                      disabled={submitting}
                      sx={{ color: theme.palette.secondary.main, fontWeight: 600 }}
                    >
                      Resend code
                    </Button>
                  </Stack>

                  {loginChannel === 'mobile' && !timeLeft === 0 && timeLeft - 30 >= 30 && (
                    <Box sx={{ textAlign: 'center', mt: 3, mb: 3 }}>
                      <Typography variant="body2" sx={{ color: theme.palette.secondary.main, fontWeight: 600 }}>
                        Didn't get it?{' '}
                        <Link
                          component="button"
                          type="button"
                          onClick={sendEmailFallback}
                          sx={{ color: theme.palette.secondary.main, fontWeight: 700 }}
                        >
                          Try email
                        </Link>
                      </Typography>
                    </Box>
                  )}

                  <Button
                    type="submit"
                    fullWidth
                    loading={submitting}
                    loadingText="Verifying…"
                    disabled={timeLeft === 0}
                    sx={{ mt: 2, borderRadius: radii.md, fontWeight: 700 }}
                  >
                    Verify and continue
                  </Button>

                  <Button
                    type="button"
                    fullWidth
                    variant="text"
                    startIcon={<ArrowLeft size={15} />}
                    onClick={goBackToMobile}
                    sx={{ mt: 2, color: theme.palette.text.secondary, fontWeight: 600 }}
                  >
                    Use a different number
                  </Button>
                </Box>
              </motion.form>
            )}
          </Stack>

          {/* ===== FOOTER LINKS =================================== */}
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 5, mt: 2 }}
          >
            <Link
              component="button"
              type="button"
              variant="body2"
              underline="hover"
              sx={{ color: theme.palette.text.secondary, fontWeight: 600 }}
              onClick={() => navigate(redirectTo)}
            >
              Continue browsing
            </Link>
            <Link
              component="button"
              type="button"
              variant="body2"
              underline="hover"
              sx={{ color: theme.palette.secondary.main, fontWeight: 600 }}
              onClick={() => navigate('/agent/login')}
            >
              I'm an agent
            </Link>
          </Stack>
        </Box>
      </Box>

      {/* Recovery email dialog is handled by the server's /auth/set-recovery-email
          when the user returns with requireEmailSetup after password login. */}
    </>
  );
}
