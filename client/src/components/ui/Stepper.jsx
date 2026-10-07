import React from 'react';
import { Box, Stepper as MuiStepper, Step, StepLabel, Typography, Button } from '@mui/material';
import { radii } from '../../theme/theme';
import { Check, ArrowLeft } from 'lucide-react';

/**
 * PART 11 Stepper/Wizard shell. Sticky progress bar, Back + Save-draft
 * buttons, one question per screen on mobile, full form on desktop.
 */
export default function Stepper({
  steps,
  activeStep,
  onStepChange,
  onBack,
  onSaveDraft,
  disableBack = false,
  saveDraftLabel = 'Save draft',
  sx,
}) {
  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        overflow: 'hidden',
        ...sx,
      }}
    >
      <MuiStepper
        activeStep={activeStep}
        orientation="vertical"
        sx={{
          px: 0,
          flex: 1,
          background: 'transparent',
          '& .MuiStepIcon-root': {
            fontSize: 28,
            width: 64,
            height: 64,
            '& svg': { width: 28, height: 28 },
          },
          '& .MuiStepLabel-label': {
            fontSize: '0.95rem',
            fontWeight: 600,
            '&.Mui-active': { color: 'secondary.main' },
            '&.Mui-done': { color: 'success.main' },
            '&.Mui-completed': { color: 'success.main' },
          },
        }}
      >
        {steps.map((step, index) => (
          <Step key={step.key || index}>
            <StepLabel
              StepIconComponent={({ active, completed, error }) => (
                <Box
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    display: 'grid',
                    placeItems: 'center',
                    backgroundColor: active || completed ? '#00A79D' : 'transparent',
                    color: '#fff',
                    fontSize: '1.1rem',
                  }}
                >
                  {active ? (
                    <>
                      <Typography variant="h5" sx={{ fontWeight: 800 }}>
                        {index + 1}
                      </Typography>
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: 'white',
                          mx: 0.5,
                        }}
                      />
                    </>
                  ) : completed ? (
                    <>
                      <Check size={24} color="#fff" />
                      <Typography variant="h6" sx={{ fontWeight: 800 }}>
                        {index + 1}
                      </Typography>
                    </>
                  ) : (
                    index + 1
                  )}
                </Box>
              )}
            >
              {({ active, completed }) => (
                <Box
                  sx={{
                    textAlign: 'left',
                    pt: 1,
                    px: 1,
                    '& .MuiStepLabel-label': { display: 'flex', alignItems: 'center', gap: 1 },
                  }}
                >
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {step.label}
                  </Typography>
                  {step.description && (
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {step.description}
                    </Typography>
                  )}
                </Box>
              )}
            </StepLabel>
          </Step>
        ))}
      </MuiStepper>

      {/* Sticky progress bar */}
      <Box
        sx={{
          position: 'sticky',
          bottom: 0,
          left: 0,
          right: 0,
          px: 3,
          py: 2.5,
          backgroundColor: 'background.paper',
          borderTop: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 3,
        }}
      >
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Step {activeStep + 1} of {steps.length}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          {!disableBack && (
            <Button
              variant="outlined"
              onClick={onBack}
              startIcon={<ArrowLeft size={15} />}
              sx={{ borderRadius: radii.md, fontWeight: 600 }}
            >
              Back
            </Button>
          )}
          {onSaveDraft && (
            <Button
              variant="text"
              onClick={onSaveDraft}
              sx={{ fontWeight: 600, borderRadius: radii.md, color: 'secondary.main' }}
            >
              {saveDraftLabel}
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
}
