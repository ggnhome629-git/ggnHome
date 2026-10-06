import React, { useRef, useState } from "react";
import { Alert, Box, Button, ButtonBase, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import { AnimatePresence, motion } from "framer-motion";
import { ImagePlus, Star, Trash2, UploadCloud } from "lucide-react";
import { radii } from "../../theme/theme";

const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Drag-and-drop photo picker with previews. The first photo is the cover.
 * value: [{ id, file, url }]. Files are checked here (type, 5 MB, max count)
 * so nothing invalid ever reaches the upload.
 */
export default function PhotoUploader({ value, onChange, max = 8, privacyNotice, tips }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [problems, setProblems] = useState([]);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [noticeSeen, setNoticeSeen] = useState(false);

  const addFiles = (fileList) => {
    const files = Array.from(fileList || []);
    const issues = [];
    const room = max - value.length;
    const accepted = [];
    files.forEach((f) => {
      if (!/^image\//.test(f.type)) issues.push(`${f.name}: not an image`);
      else if (f.size > MAX_BYTES) issues.push(`${f.name}: larger than 5 MB`);
      else if (accepted.length >= room) issues.push(`${f.name}: only ${max} photos allowed`);
      else accepted.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, file: f, url: URL.createObjectURL(f) });
    });
    setProblems(issues);
    if (accepted.length) onChange([...value, ...accepted]);
  };

  const openPicker = () => {
    if (privacyNotice && !noticeSeen) setNoticeOpen(true);
    else inputRef.current?.click();
  };

  const remove = (id) => {
    const gone = value.find((p) => p.id === id);
    if (gone?.url?.startsWith("blob:")) URL.revokeObjectURL(gone.url);
    onChange(value.filter((p) => p.id !== id));
  };
  const makeCover = (id) => {
    const p = value.find((x) => x.id === id);
    onChange([p, ...value.filter((x) => x.id !== id)]);
  };

  return (
    <Box>
      <ButtonBase
        onClick={openPicker}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        disabled={value.length >= max}
        sx={{
          width: "100%",
          flexDirection: "column",
          gap: 2,
          py: { xs: 7, md: 9 },
          px: 4,
          borderRadius: `${radii.lg}px`,
          border: "2px dashed",
          borderColor: dragging ? "secondary.main" : "#B9CFE0",
          backgroundColor: dragging ? "rgba(0,167,157,0.06)" : "#F7FAFC",
          transition: "all .15s ease",
          "&:hover": { borderColor: "secondary.main" },
          "&.Mui-disabled": { opacity: 0.6 },
        }}
      >
        <Box sx={{ width: 56, height: 56, borderRadius: "50%", backgroundColor: "rgba(0,167,157,0.12)", color: "secondary.main", display: "grid", placeItems: "center" }}>
          <UploadCloud size={28} />
        </Box>
        <Typography sx={{ fontWeight: 700, color: "primary.main" }}>
          {value.length >= max ? `All ${max} photos added` : "Drag photos here or click to upload"}
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          JPG, PNG or WebP · up to 5 MB each · {value.length}/{max} added
        </Typography>
      </ButtonBase>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*"
        hidden
        data-testid="photo-input"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {problems.length > 0 && (
        <Alert severity="warning" sx={{ mt: 3 }} onClose={() => setProblems([])}>
          Some files were skipped: {problems.join("; ")}
        </Alert>
      )}

      {value.length > 0 && (
        <Box sx={{ mt: 4, display: "grid", gap: 3, gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(3, 1fr)", md: "repeat(4, 1fr)" } }}>
          <AnimatePresence initial={false}>
            {value.map((p, i) => (
              <Box
                key={p.id}
                component={motion.div}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                sx={{ position: "relative", aspectRatio: "4 / 3", borderRadius: `${radii.md}px`, overflow: "hidden", border: "1px solid", borderColor: i === 0 ? "secondary.main" : "divider" }}
              >
                <img src={p.url} alt={`Upload ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                {i === 0 ? (
                  <Box sx={{ position: "absolute", left: 8, top: 8, px: 2, py: 0.5, borderRadius: 999, backgroundColor: "secondary.main", color: "#fff", fontSize: 11, fontWeight: 800 }}>Cover</Box>
                ) : (
                  <Tooltip title="Make cover photo">
                    <IconButton size="small" aria-label="Make cover photo" onClick={() => makeCover(p.id)} sx={{ position: "absolute", left: 6, top: 6, backgroundColor: "rgba(255,255,255,0.92)", "&:hover": { backgroundColor: "#fff" } }}>
                      <Star size={14} />
                    </IconButton>
                  </Tooltip>
                )}
                <Tooltip title="Remove">
                  <IconButton size="small" aria-label="Remove photo" onClick={() => remove(p.id)} sx={{ position: "absolute", right: 6, top: 6, backgroundColor: "rgba(255,255,255,0.92)", color: "#DC2626", "&:hover": { backgroundColor: "#fff" } }}>
                    <Trash2 size={14} />
                  </IconButton>
                </Tooltip>
              </Box>
            ))}
          </AnimatePresence>
          {value.length < max && (
            <ButtonBase onClick={openPicker} aria-label="Add more photos" sx={{ aspectRatio: "4 / 3", borderRadius: `${radii.md}px`, border: "1.5px dashed", borderColor: "divider", color: "text.secondary", flexDirection: "column", gap: 1 }}>
              <ImagePlus size={22} />
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                Add more
              </Typography>
            </ButtonBase>
          )}
        </Box>
      )}

      {tips && (
        <Stack component="ul" spacing={1} sx={{ mt: 4, pl: 5, color: "text.secondary", fontSize: 14 }}>
          {tips.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </Stack>
      )}

      <Dialog open={noticeOpen} onClose={() => setNoticeOpen(false)} maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800, color: "primary.main" }}>A Quick Privacy Note</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {privacyNotice}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 5, pb: 4 }}>
          <Button onClick={() => setNoticeOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="secondary"
            onClick={() => {
              setNoticeSeen(true);
              setNoticeOpen(false);
              inputRef.current?.click();
            }}
          >
            I Understand
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
