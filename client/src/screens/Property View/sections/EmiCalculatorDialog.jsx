import React, { useMemo, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  IconButton,
  Slider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { X } from "lucide-react";
import { radii } from "../../../theme/theme";
import { formatCurrency } from "../../../utils/propertyModel";

/**
 * Standard reducing-balance EMI:
 *   EMI = P·r·(1+r)^n / ((1+r)^n − 1), r = annual rate / 12 / 100
 */
function calculateEmi(principal, annualRate, years) {
  const p = Number(principal);
  const n = Number(years) * 12;
  const r = Number(annualRate) / 12 / 100;
  if (!p || !n || p <= 0 || n <= 0) return { emi: 0, totalPayable: 0, totalInterest: 0 };
  if (r === 0) return { emi: p / n, totalPayable: p, totalInterest: 0 };
  const factor = (1 + r) ** n;
  const emi = (p * r * factor) / (factor - 1);
  const totalPayable = emi * n;
  return { emi, totalPayable, totalInterest: totalPayable - p };
}

export default function EmiCalculatorDialog({ open, onClose, propertyPrice }) {
  const price = Number(propertyPrice) || 0;
  const [downPaymentPct, setDownPaymentPct] = useState(20);
  const [rate, setRate] = useState(8.5);
  const [years, setYears] = useState(20);

  const downPayment = Math.round((price * downPaymentPct) / 100);
  const loanAmount = Math.max(0, price - downPayment);
  const { emi, totalPayable, totalInterest } = useMemo(
    () => calculateEmi(loanAmount, rate, years),
    [loanAmount, rate, years]
  );

  const results = [
    { label: "Monthly EMI", value: formatCurrency(Math.round(emi)), emphasis: true },
    { label: "Loan amount", value: formatCurrency(loanAmount) },
    { label: "Total interest", value: formatCurrency(Math.round(totalInterest)) },
    { label: "Total payable", value: formatCurrency(Math.round(totalPayable + downPayment)) },
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: `${radii.lg}px` } } }}>
      <Stack spacing={5} sx={{ p: { xs: 5, md: 7 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h3" sx={{ fontSize: "1.2rem", color: "primary.main" }}>
            EMI calculator
          </Typography>
          <IconButton onClick={onClose} size="small" aria-label="Close calculator">
            <X size={18} />
          </IconButton>
        </Stack>

        <TextField
          label="Property price"
          size="small"
          value={formatCurrency(price) || "—"}
          InputProps={{ readOnly: true }}
          fullWidth
        />

        <Box>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Down payment ({downPaymentPct}%)
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, color: "primary.main" }}>
              {formatCurrency(downPayment)}
            </Typography>
          </Stack>
          <Slider
            value={downPaymentPct}
            onChange={(_, v) => setDownPaymentPct(v)}
            min={0}
            max={80}
            step={5}
            color="secondary"
            valueLabelDisplay="auto"
            valueLabelFormat={(v) => `${v}%`}
          />
        </Box>

        <Box>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Interest rate
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, color: "primary.main" }}>
              {rate}% p.a.
            </Typography>
          </Stack>
          <Slider value={rate} onChange={(_, v) => setRate(v)} min={5} max={15} step={0.1} color="secondary" valueLabelDisplay="auto" />
        </Box>

        <Box>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Loan tenure
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, color: "primary.main" }}>
              {years} years
            </Typography>
          </Stack>
          <Slider value={years} onChange={(_, v) => setYears(v)} min={1} max={30} step={1} color="secondary" valueLabelDisplay="auto" />
        </Box>

        <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" } }}>
          {results.map((r) => (
            <Stack
              key={r.label}
              spacing={1}
              sx={{
                p: 4,
                borderRadius: `${radii.sm}px`,
                backgroundColor: r.emphasis ? "primary.main" : "background.default",
              }}
            >
              <Typography variant="caption" sx={{ color: r.emphasis ? "rgba(255,255,255,0.75)" : "text.secondary" }}>
                {r.label}
              </Typography>
              <Typography variant="h4" sx={{ fontSize: "1.15rem", color: r.emphasis ? "common.white" : "primary.main" }}>
                {r.value || "—"}
              </Typography>
            </Stack>
          ))}
        </Box>

        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          Indicative only. Actual EMI depends on the lender's rate, processing fees and eligibility.
        </Typography>

        <Button variant="contained" onClick={onClose}>
          Done
        </Button>
      </Stack>
    </Dialog>
  );
}
