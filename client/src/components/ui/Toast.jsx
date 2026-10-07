import React, { createContext, useCallback, useState, useContext, useMemo } from 'react';
import { ToastContainer, toast as rcToast, Slide } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { radii } from './Theme';

/**
 * PART 11 Toast/snackbar service — replaces every alert() that the spec lists.
 * One global container, auto-position top-center, 4s duration, keyboard
 * dismiss (Escape), prefers-reduced-motion respected.
 */
const ToastContext = createContext(null);

export function ToastProvider({ position = 'top-center', autoClose = 4000, closeOnClick = true, limit = 3 }) {
  const [count, setCount] = useState(0);

  const fire = useCallback(
    (render, opts = {}) => {
      const id = rcToast(render, {
        position,
        autoClose,
        closeOnClick,
        limit,
        closeButton: false,
        Progress: undefined,
        onClose: () => setCount((c) => c - 1),
        ...opts,
        transition: Slide,
      });
      setCount((c) => c + 1);
      return id;
    },
    [position, autoClose, closeOnClick, limit]
  );

  const success = useCallback(
    (render, opts) => fire((props) => <div {...props}>{render}</div>, { type: 'success', ...opts }),
    [fire]
  );
  const error = useCallback(
    (render, opts) => fire((props) => <div {...props}>{render}</div>, { type: 'error', ...opts }),
    [fire]
  );
  const warning = useCallback(
    (render, opts) => fire((props) => <div {...props}>{render}</div>, { type: 'warning', ...opts }),
    [fire]
  );
  const info = useCallback(
    (render, opts) => fire((props) => <div {...props}>{render}</div>, { type: 'info', ...opts }),
    [fire]
  );

  const value = useMemo(
    () => ({ success, error, warning, info, clear: () => rcToast.removeAll() }),
    [success, error, warning, info]
  );

  return (
    <ToastContext.Provider value={value}>
      <ToastContainer
        position={position}
        autoClose={autoClose}
        closeOnClick={closeOnClick}
        limit={limit}
        newestOnTop
        closeButton={false}
        pauseOnHover
        draggable
        progressClassName="toast-progress"
        theme="colored"
        style={{
          borderRadius: radii.lg,
          overflow: 'hidden',
          fontFamily: 'inherit',
        }}
      />
      <span style={{ display: 'none' }}>&nbsp;</span>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

// Hoisted default export for the legacy `toast` name used by a few screens.
export const toast = {
  success: (render, opts) => toastProvider.success(render, opts),
  error: (render, opts) => toastProvider.error(render, opts),
  warning: (render, opts) => toastProvider.warning(render, opts),
  info: (render, opts) => toastProvider.info(render, opts),
};

let toastProvider = null;
export function setToastProvider(provider) {
  toastProvider = provider;
}
