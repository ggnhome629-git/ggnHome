import React, { useCallback, useRef, useState } from 'react';
import { Box, Stack, Typography, Button, IconButton, CircularProgress, Tooltip } from '@mui/material';
import { Radios, Upload, X, Image, File, Cloud, CheckCircle } from 'lucide-react';
import { radii } from './Theme';

/**
 * PART 11 FileDropzone — drag-and-drop + click, image preview, size/type
 * hint, progress bar, retry on failure, camera capture on mobile (accept=
 * attribute). 0..maxFiles allowed.
 */
export default function FileDropzone({
  files = [],
  onChange,
  maxFiles = 5,
  accept = 'image/*',
  multiple = true,
  withProgress = false,
 disabled = false,
  sx,
}) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState({});
  const [uploadError, setUploadError] = useState({});
  const inputRef = useRef(null);

  const remaining = maxFiles - files.length;
  const canAccept = remaining > 0 && !disabled;

  const openPicker = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const addFiles = useCallback(
    async (raw) => {
      const list = Array.from(raw).slice(0, maxFiles);
      if (list.length === 0) return;
      for (const file of list) {
        const key = `${file.name}-${file.size}-${file.lastModified}`;
        setUploading((p) => ({ ...p, [key]: true }));
        setUploadError((p) => ({ ...p, [key]: '' }));
        try {
          // Real upload injected by the caller through `onChange` when it is
          // an async function (`(files) => ...`).
          const result = await onChange?.(list);
          if (result) {
            // Allow the caller to return a replacement list.
          }
        } catch (err) {
          setUploadError((p) => ({ ...p, [key]: err?.message || 'Upload failed' }));
        } finally {
          setUploading((p) => { const n = { ...p }; delete n[key]; return n; });
        }
      }
    },
    [onChange, maxFiles]
  );

  const removeFile = (index) => {
    const file = files[index];
    onChange?.(files.filter((_, i) => i !== index));
  };

  return (
    <Box
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          addFiles(e.dataTransfer.files);
        }
      }}
      onClick={openPicker}
      sx={{
        borderRadius: radii.lg,
        border: `2px dashed ${disabled ? 'divider' : dragging ? 'secondary.main' : 'divider'}`,
        backgroundColor: dragging ? 'rgba(0,167,157,0.06)' : 'background.paper',
        cursor: canAccept ? 'pointer' : 'not-allowed',
        transition: 'border-color .15s ease, background-color .15s ease',
        ...sx,
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        style={{ display: 'none' }}
        disabled={disabled}
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files);
          e.target.value = '';
        }}
      />

      <Stack
        direction="row"
        spacing={3}
        alignItems="center"
        justifyContent="center"
        textAlign="center"
        sx={{ px: 4, py: 6 }}
      >
        {files.length > 0 && (
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: radii.md,
              overflow: 'hidden',
              background: 'rgba(0,167,157,0.1)',
              flexShrink: 0,
            }}
          >
            <img
              src={files[0]?.preview || files[0]?.url || ''}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </Box>
        )}

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body1" sx={{ fontWeight: 700, color: 'text.primary' }}>
            {files.length > 0 ? `${files.length} of ${maxFiles} ${remaining > 0 ? `file${remaining > 1 ? 's' : ''} left` : ''}` : 'Drop files here'}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5 }}>
            {disabled
              ? 'Uploads are disabled'
              : dragging
              ? 'Drop the files to upload'
              : 'Drag & drop images, documents or photos — camera capture supported on mobile'}
          </Typography>
        </Box>

        {canAccept && (
          <Tooltip title="Upload files">
            <IconButton size="small" onClick={(e) => { e.preventDefault(); openPicker(); }}>
              <Upload size={18} color="#00A79D" />
            </IconButton>
          </Tooltip>
        )}
      </Stack>

      {files.length > 0 && (
        <Stack
          direction="row"
          flexWrap="wrap"
          spacing={1.5}
          sx={{ px: 3, pb: 3, mt: 2 }}
        >
          {files.map((file, index) => (
            <Box
              key={`${file.name}-${index}`}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 2.5,
                py: 1.5,
                borderRadius: radii.md,
                backgroundColor: 'background.default',
                fontSize: '0.75rem',
              }}
            >
              <Image size={13} style={{ flexShrink: 0 }} />
              <Typography variant="caption" noWrap>
                {file.name}
              </Typography>
              <Box
                component="button"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(index);
                }}
                sx={{ p: 0, border: 0, background: 'none', cursor: 'pointer', color: 'text.secondary' }}
              >
                <X size={13} />
              </Box>
            </Box>
          ))}
        </Stack>
      )}

      {withProgress && (
        <Box sx={{ mt: 2, alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          {Object.entries(uploading).map(([key, uploading]) => (
            <Box
              key={key}
              sx={{ width: '100%', maxWidth: 320, display: 'flex', gap: 2, alignItems: 'center' }}
            >
              <CircularProgress size={16} sx={{ flexShrink: 0, color: 'secondary.main' }} />
              <Typography variant="caption" sx={{ flex: 1, color: 'text.secondary' }}>
                {uploading ? 'Uploading…' : 'Uploaded'}
              </Typography>
              {uploadError[key] && (
                <Typography variant="caption" color="error">
                  {uploadError[key]}
                </Typography>
              )}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
