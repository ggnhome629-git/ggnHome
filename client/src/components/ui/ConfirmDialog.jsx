import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Alert,
  Typography,
  Box,
} from '@mui/material';
import { radii } from '../../theme/theme';
import { Check } from 'lucide-react';

/**
 * PART 11 ConfirmDialog — one shared destructive-action modal: names the
 * resource, states the impact, focuses Cancel, and can demand typed
 * confirmation for irreversible bulk actions.
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  impact,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  requireText,
  onConfirm,
  onCancel,
  loading = false,
  sx,
}) {
  const [typed, setTyped] = React.useState('');

  React.useEffect(() => {
    if (!open) setTyped('');
  }, [open]);

  const blocked = Boolean(requireText) && typed.trim() !== String(requireText);

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="xs"
      fullWidth
      slotProps={{
        paper: {
          sx: { borderRadius: radii.lg, bgcolor: 'background.paper', ...sx },
        },
      }}
    >
      <DialogTitle sx={{ fontSize: '1.05rem', fontWeight: 700, color: 'primary.main', pb: 1 }}>
        {title}
      </DialogTitle>
      <DialogContent>
        {message && (
          <DialogContentText sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>
            {message}
          </DialogContentText>
        )}
        {impact && (
          <Alert severity="warning" sx={{ mt: 2, borderRadius: '8px', fontSize: '0.8rem' }}>
            {impact}
          </Alert>
        )}
        {requireText && (
          <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Type <b>{requireText}</b> to confirm
            </Typography>
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              aria-label={`Type ${requireText} to confirm`}
              style={{
                display: 'block',
                width: '100%',
                padding: '10px 12px',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: radii.md,
                font: 'inherit',
              }}
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onCancel} autoFocus sx={{ color: 'text.secondary' }}>
          {cancelLabel}
        </Button>
        <Button
          disabled={blocked || loading}
          onClick={onConfirm}
          variant="contained"
          color={danger ? 'error' : 'primary'}
          startIcon={loading && <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid currentColor', borderTopColor: '#fff', animation: 'spin 1s linear infinite' }} />}
          sx={{ fontWeight: 600, borderRadius: radii.md }}
        >
          {loading ? 'Working…' : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
