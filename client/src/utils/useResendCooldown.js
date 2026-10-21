import { useCallback, useEffect, useState } from "react";

/**
 * Countdown for "Resend OTP" buttons. `remaining` is 0 when a resend is allowed;
 * `start()` begins the wait (default `seconds`, or an override such as the
 * retryAfterSec the server sends with a 429).
 */
export default function useResendCooldown(seconds = 30) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (remaining <= 0) return undefined;
    const timer = setTimeout(() => setRemaining((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining]);

  const start = useCallback((override) => setRemaining(Math.max(0, Math.ceil(override ?? seconds))), [seconds]);
  const stop = useCallback(() => setRemaining(0), []);

  return { remaining, start, stop };
}
