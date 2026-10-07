import React, { useState, useMemo, useCallback } from 'react';
import { Box, TextField, Chip, IconButton, Menu, ListItemButton, ListItemText, Typography } from '@mui/material';
import { X, Plus, Search, TrendingUp } from 'lucide-react';
import { radii } from './Theme';

/**
 * PART 11 SearchableChipSelect — searchable multi-select chips for sectors,
 * areas, BHK and other category fields. Shows a "Popular" row and a count.
 * `options` = [{ value, label, count }].
 */
export default function SearchableChipSelect({
  value = [],
  options = [],
  label = 'Select',
  placeholder = 'Type to search…',
  onChange,
  maxSelected = 8,
  popularKeys = [],
  getLabel = (o) => o.label,
  itemToValue = (o) => o.value,
  sx,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [menuAnchor, setMenuAnchor] = useState(null);

  const selectedKeys = useMemo(() => new Set(value.map(itemToValue)), [value, itemToValue]);
  const popular = useMemo(() => options.filter((o) => popularKeys.includes(itemToValue(o))), [options, popularKeys, itemToValue]);
  const rest = useMemo(
    () => options.filter((o) => !popularKeys.includes(itemToValue(o))),
    [options, popularKeys, itemToValue]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [...popular, ...rest];
    return [...popular, ...rest].filter((o) => getLabel(o).toLowerCase().includes(q));
  }, [popular, rest, query, getLabel, itemToValue]);

  const handleToggle = useCallback(
    (option) => {
      const key = itemToValue(option);
      const next = selectedKeys.has(key)
        ? Array.from(selectedKeys).filter((k) => k !== key)
        : Array.from(selectedKeys).size >= maxSelected
        ? [...selectedKeys]
        : [...selectedKeys, key];
      onChange?.(next);
      setOpen(false);
      setQuery('');
    },
    [selectedKeys, maxSelected, itemToValue, getLabel, onChange]
  );

  const handleClose = useCallback(() => {
    setOpen(false);
    setQuery('');
  }, []);

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: 480,
        ...sx,
      }}
    >
      <Box
        onClick={() => setOpen(true)}
        sx={{
          cursor: 'pointer',
          '&:hover': { backgroundColor: 'rgba(0,167,157,0.04)' },
        }}
      >
        <TextField
          fullWidth
          label={label}
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={value.length >= maxSelected}
          InputProps={{
            endAdornment: (
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggle(popular[0] || { value: '', label: 'Popular' });
                }}
                disabled={selectedKeys.size >= maxSelected}
                aria-label="Add popular"
              >
                <Plus size={16} color={selectedKeys.size >= maxSelected ? 'text.secondary' : '#00A79D'} />
              </IconButton>
            ),
            startAdornment: (
              <Search size={16} color="text.secondary" style={{ marginRight: 8 }} />
            ),
          }}
          sx={{
            backgroundColor: 'background.paper',
            borderRadius: radii.md,
            fontWeight: 600,
            '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'secondary.main' },
            '&.Mui-disabled': { backgroundColor: 'background.default', color: 'text.secondary' },
          }}
        />
      </Box>

      {value.length > 0 && (
        <Box sx={{ mt: 1.5, flexWrap: 'wrap', gap: 1 }}>
          {value.map((key) => {
            const option = options.find((o) => itemToValue(o) === key);
            const label = option ? getLabel(option) : key;
            const Icon = option?.icon || Plus;
            return (
              <Chip
                key={key}
                label={label}
                onDelete={() => handleToggle(option || { value: key })}
                deleteIcon={<X size={14} />}
                size="small"
                variant="outlined"
                sx={{
                  backgroundColor: 'rgba(0,167,157,0.08)',
                  color: 'secondary.dark',
                  fontWeight: 600,
                }}
              />
            );
          })}
        </Box>
      )}

      <Menu
        open={open}
        anchorEl={menuAnchor}
        onClose={handleClose}
        PaperProps={{
          sx: {
            maxHeight: 360,
            width: 420,
            borderRadius: radii.lg,
            overflow: 'hidden',
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary' }}>
            {value.length > 0 ? `Selected: ${value.length} / ${maxSelected}` : 'Search options'}
          </Typography>
        </Box>
        <Box sx={{ overflowY: 'auto', p: 1 }}>
          {filtered.map((option) => {
            const key = itemToValue(option);
            const selected = selectedKeys.has(key);
            return (
              <Box
                key={key}
                onClick={() => handleToggle(option)}
                sx={{
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1.5,
                  p: 1.5,
                  borderRadius: radii.sm,
                  '&:hover': { backgroundColor: 'rgba(0,167,157,0.06)' },
                }}
              >
                <Box sx={{ minWidth: 0, flex: 1, textAlign: 'left' }}>
                  <Typography variant="body2" noWrap sx={{ fontWeight: 600, color: 'text.primary' }}>
                    {getLabel(option)}
                  </Typography>
                  {option.count != null && (
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {option.count}
                    </Typography>
                  )}
                </Box>
                <Box
                  sx={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: selected ? '#00A79D' : 'transparent',
                    color: '#fff',
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                  }}
                >
                  {selected ? <Check size={13} /> : <Plus size={13} />}
                </Box>
              </Box>
            );
          })}
        </Box>
      </Menu>
    </Box>
  );
}

import { Check } from 'lucide-react';
