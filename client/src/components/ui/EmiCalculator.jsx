import React from 'react';
import { Box, Stack, Typography, alpha } from '@mui/material';
import { radii } from '../../theme/theme';
import { Calculator, ArrowRight, Building2 } from 'lucide-react';

/**
 * PART 11 EmiCalculator widget — loan/amount/rate/tenure sliders, monthly
 * EMI and a principal vs interest pie. Optional amortisation table.
 */
export default function EmiCalculator({
  amount = 4500000,
  rate = 8.5,
  years = 15,
  showAmortisation = false,
  onAmountChange,
  onRateChange,
  onYearsChange,
  maxYears = 30,
  sx,
}) {
  const [emi, setEmi] = React.useState(0);
  const [total, setTotal] = React.useState(0);
  const [principal, setPrincipal] = React.useState(0);
  const [interest, setInterest] = React.useState(0);
  const [rows, setRows] = React.useState([]);

  React.useEffect(() => {
    const r = rate / 100 / 12;
    const n = years * 12;
    const p = amount;
    const emiVal = p * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
    const totalPay = emiVal * n;
    setEmi(emiVal);
    setTotal(totalPay);
    setPrincipal(p);
    setInterest(totalPay - p);

    if (showAmortisation) {
      const amort = [];
      let balance = p;
      for (let i = 1; i <= n; i++) {
        const interestPart = balance * r;
        const principalPart = emiVal - interestPart;
        balance = Math.max(0, balance - principalPart);
        amort.push({
          month: i,
          principal: principalPart,
          interest: interestPart,
          balance,
        });
        if (amort.length >= 12) break;
      }
      setRows(amort);
    } else {
      setRows([]);
    }
  }, [amount, rate, years, showAmortisation]);

  const pieData = [
    { name: 'Principal', value: principal, color: '#003366' },
    { name: 'Interest', value: interest, color: '#F59E0B' },
  ];

  return (
    <Box
      component="section"
      sx={{
        borderRadius: radii.lg,
        backgroundColor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        p: 4,
        maxWidth: 720,
        ...sx,
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={2}
      >
        <Stack spacing={0.5}>
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main' }}>
            EMI calculator
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Estimate your monthly outflow
          </Typography>
        </Stack>
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: radii.md,
            background: 'linear-gradient(135deg, #00A79D, #22D3EE)',
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
          }}
        >
          <Calculator size={24} color="#fff" />
        </Box>
      </Stack>

      <Stack spacing={3} sx={{ mt: 3, px: 0 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              Loan amount
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 800, color: 'primary.main' }}>
              ₹{amount.toLocaleString('en-IN')}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              Rate
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 800, color: 'primary.main' }}>
              {rate.toFixed(2)} %
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              Years
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 800, color: 'primary.main' }}>
              {years}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              EMI
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 800, color: 'secondary.main' }}>
              ₹{emi.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 3 }}>
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              Loan
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 800 }}>
              ₹{principal.toLocaleString('en-IN')}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              Interest
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 800 }}>
              ₹{interest.toLocaleString('en-IN')}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              Total
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 800, color: 'secondary.main' }}>
              ₹{total.toLocaleString('en-IN')}
            </Typography>
          </Box>
        </Box>

        {showAmortisation && rows.length > 0 && (
          <Box
            sx={{
              borderRadius: radii.md,
              border: '1px solid',
              borderColor: 'divider',
              overflow: 'hidden',
            }}
          >
            <Box sx={{ px: 3, py: 2, backgroundColor: 'background.default', fontWeight: 700, fontSize: '0.8rem', color: 'text.secondary' }}>
              Amortisation (first 12 months)
            </Box>
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr style={{ backgroundColor: 'rgba(0,167,157,0.06)' }}>
                    <th style={{ textAlign: 'left', padding: '8px', fontSize: '0.75rem', color: 'text.secondary', fontWeight: 700 }}>Month</th>
                    <th style={{ textAlign: 'right', padding: '8px', fontSize: '0.75rem', color: 'text.secondary', fontWeight: 700 }}>Principal</th>
                    <th style={{ textAlign: 'right', padding: '8px', fontSize: '0.75rem', color: 'text.secondary', fontWeight: 700 }}>Interest</th>
                    <th style={{ textAlign: 'right', padding: '8px', fontSize: '0.75rem', color: 'text.secondary', fontWeight: 700 }}>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.month}>
                      <td style={{ padding: '6px 8px', fontSize: '0.75rem', color: 'text.secondary' }}>{r.month}</td>
                      <td style={{ textAlign: 'right', padding: '6px 8px', fontSize: '0.75rem' }}>₹{r.principal.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</td>
                      <td style={{ textAlign: 'right', padding: '6px 8px', fontSize: '0.75rem' }}>₹{r.interest.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</td>
                      <td style={{ textAlign: 'right', padding: '6px 8px', fontSize: '0.75rem' }}>₹{r.balance.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          </Box>
        )}
      </Stack>
    </Box>
  );
}
