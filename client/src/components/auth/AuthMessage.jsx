import React from "react";
import { Alert, Collapse } from "@mui/material";

/**
 * Form-level feedback (OTP sent, login failed, account pending approval).
 *
 * Wrapped in a Collapse so the card grows into the message instead of the
 * form jumping; `role="alert"` so assistive tech announces it, which a plain
 * coloured div never did.
 */
export default function AuthMessage({ message, onClose }) {
  return (
    <Collapse in={Boolean(message)} unmountOnExit>
      <Alert
        severity={message?.type === "success" ? "success" : message?.type === "warning" ? "warning" : "error"}
        onClose={onClose}
        role="alert"
        sx={{ mb: 5, borderRadius: 2, alignItems: "center", "& .MuiAlert-message": { fontWeight: 500 } }}
      >
        {message?.text}
      </Alert>
    </Collapse>
  );
}
