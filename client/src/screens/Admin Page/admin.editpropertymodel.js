import React, { useEffect, useState, useRef } from "react";
import { toast } from "react-toastify";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { ImagePlus, Upload, X } from "lucide-react";
import { EmptyState } from "./shell/adminUi";
import "./admin.css";

/** Shared section-card chrome from the admin design tokens (sx, never inline style objects). */
const SECTION_CARD = {
  bgcolor: "#FFFFFF",
  borderRadius: "12px",
  p: 4,
  border: "1px solid",
  borderColor: "divider",
  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
};

const SECTION_TITLE = {
  fontWeight: 700,
  color: "primary.main",
  fontSize: "1rem",
  mb: 3,
  pb: 2,
  borderBottom: "2px solid #22D3EE",
};

const CAPTION = {
  display: "block",
  fontWeight: 700,
  color: "text.secondary",
  mb: 1,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const GROUPS_RENTAL = [
  {
    name: "Property Basics",
    fields: [
      { key: "title", label: "Title", type: "text" },
      { key: "description", label: "Description", type: "textarea" },
      { key: "address", label: "Address", type: "text" },
      { key: "Sector", label: "Sector", type: "text" },
      { key: "ownernumber", label: "Owner / Agent Mobile", type: "text" },
      { key: "propertyType", label: "Property Type", type: "select", options: ["house", "apartment", "condo", "townhouse", "villa"] },
      { key: "purpose", label: "Purpose", type: "text" },
      { key: "bedrooms", label: "Bedrooms", type: "number" },
      { key: "bathrooms", label: "Bathrooms", type: "number" },
      { key: "layoutFeatures", label: "Layout Features", type: "text" },
      { key: "conditionAge", label: "Condition / Age", type: "text" },
      { key: "renovations", label: "Renovations", type: "text" },
      { key: "parking", label: "Parking", type: "text" },
      { key: "outdoorSpace", label: "Outdoor Space", type: "text" },
    ],
  },
  {
    name: "Area Details",
    fields: [
      { key: "totalArea.sqft", label: "Total Area (sqft)", type: "number" },
      { key: "totalArea.configuration", label: "Configuration", type: "text" },
    ],
  },
  {
    name: "Financial & Lease Terms",
    fields: [
      { key: "monthlyRent", label: "Monthly Rent", type: "number" },
      { key: "leaseTerm", label: "Lease Term", type: "text" },
      { key: "securityDeposit", label: "Security Deposit", type: "text" },
      { key: "otherFees", label: "Other Fees", type: "text" },
      { key: "utilities", label: "Utilities", type: "array" },
      { key: "tenantRequirements", label: "Tenant Requirements", type: "text" },
      { key: "moveInDate", label: "Move-in Date", type: "date" },
    ],
  },
  {
    name: "Location & Amenities",
    fields: [
      { key: "neighborhoodVibe", label: "Neighborhood Vibe", type: "text" },
      { key: "transportation", label: "Transportation", type: "text" },
      { key: "localAmenities", label: "Local Amenities", type: "text" },
      { key: "communityFeatures", label: "Community Features", type: "array" },
      { key: "appliances", label: "Appliances", type: "array" },
    ],
  },
  {
    name: "Policies & Logistics",
    fields: [
      { key: "petPolicy", label: "Pet Policy", type: "text" },
      { key: "smokingPolicy", label: "Smoking Policy", type: "text" },
      { key: "maintenance", label: "Maintenance", type: "text" },
      { key: "insurance", label: "Insurance", type: "text" },
    ],
  },
  {
    name: "Images",
    fields: [
      { key: "images", label: "Images", type: "file", multiple: true },
    ],
  },
];

const GROUPS_SALE = [
  {
    name: "Basic Details",
    fields: [
      { key: "title", label: "Title", type: "text" },
      { key: "description", label: "Description", type: "textarea" },
      { key: "price", label: "Price", type: "number" },
      { key: "totalArea.sqft", label: "Total Area (sqft)", type: "number" },
      { key: "totalArea.configuration", label: "Configuration", type: "text" },
      { key: "bedrooms", label: "Bedrooms", type: "number" },
      { key: "bathrooms", label: "Bathrooms", type: "number" },
      { key: "location", label: "Location", type: "text" },
      { key: "Sector", label: "Sector", type: "text" },
      { key: "ownernumber", label: "Owner / Agent Mobile", type: "text" },
    ],
  },
  {
    name: "Images",
    fields: [
      { key: "images", label: "Images", type: "file", multiple: true },
    ],
  },
];

const ALL_FIELDS_RENTAL = GROUPS_RENTAL.flatMap(g => g.fields.map(f => f.key));
const ALL_FIELDS_SALE = GROUPS_SALE.flatMap(g => g.fields.map(f => f.key));

function getInitialFormData(groups = GROUPS_RENTAL) {
  let obj = {};
  for (const group of groups) {
    for (const field of group.fields) {
      if (field.type === "checkbox") obj[field.key] = false;
      else if (field.type === "array") obj[field.key] = [];
      else if (field.type === "file") obj[field.key] = [];
      else obj[field.key] = "";
    }
  }
  return obj;
}

function formatArrayValue(value) {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "string") return value;
  return "";
}
export default function EditPropertyModal({ propertyId, isOpen, onClose, onSuccess }) {
  const [propertyType, setPropertyType] = useState("rental");
  const [formData, setFormData] = useState(getInitialFormData(GROUPS_RENTAL));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [existingImages, setExistingImages] = useState([]);
  const [newImages, setNewImages] = useState([]);
  // 360° panoramas
  const [existingPanos, setExistingPanos] = useState([]); // [{title,url,yaw,pitch,notes}]
  const [newPanos, setNewPanos] = useState([]); // [{ file, title, yaw, pitch, notes }]
  const panoInputRef = useRef(null);
  const fileInputRef = useRef(null);

  // Sanitizer: trims strings, removes empty strings, coerces numeric-like fields,
  // normalizes enums, but importantly **does not** modify totalArea keys (keeps current dotted-key behavior).
  function sanitizePayload(raw) {
    const ALLOWED_PROPERTY_TYPES = ["house","apartment","condo","townhouse","villa"];
    const clone = JSON.parse(JSON.stringify(raw || {}));

    function walk(obj, parentKey = '') {
      for (const k of Object.keys(obj)) {
        const fullKey = parentKey ? `${parentKey}.${k}` : k;

        // Preserve any totalArea dotted keys or nested totalArea object entirely
        if (fullKey.startsWith('totalArea')) continue;

        const v = obj[k];
        if (typeof v === 'string') {
          const t = v.trim();
          if (t === '') {
            delete obj[k];
            continue;
          }
          // Coerce numeric-ish top-level keys to numbers where appropriate
          if (["monthlyRent","price","securityDeposit","bedrooms","bathrooms"].includes(k)) {
            const n = Number(t);
            if (!Number.isNaN(n)) obj[k] = n;
            else obj[k] = t;
          } else {
            obj[k] = t;
          }
        } else if (Array.isArray(v)) {
          obj[k] = v.map(x => (typeof x === 'string' ? x.trim() : x)).filter(Boolean);
          if (obj[k].length === 0) delete obj[k];
        } else if (v && typeof v === 'object') {
          walk(v, fullKey);
          if (Object.keys(obj[k] || {}).length === 0) delete obj[k];
        } else if (v === null || typeof v === 'undefined') {
          delete obj[k];
        }
      }
    }

    walk(clone);

    // Normalize propertyType to allowed lowercase enum or remove it
    if (clone.propertyType) {
      const low = String(clone.propertyType).trim().toLowerCase();
      if (ALLOWED_PROPERTY_TYPES.includes(low)) clone.propertyType = low;
      else delete clone.propertyType;
    }

    return clone;
  }
  const [uploadHover, setUploadHover] = useState(false);

  // Responsive + pager (mobile turns the form into pages)
  const [isMobile, setIsMobile] = useState(() =>
    (typeof window !== 'undefined' ? window.innerWidth < 768 : false)
  );
  const [page, setPage] = useState(0);

  useEffect(() => {
    function onResize() {
      if (typeof window === 'undefined') return;
      const m = window.innerWidth < 768;
      setIsMobile(m);
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!isOpen || !propertyId) return;
    setLoading(true);
    setError("");
    setFormData(getInitialFormData(GROUPS_RENTAL));
    setExistingImages([]);
    setNewImages([]);
    const token = localStorage.getItem("accessToken");
    fetch(`${process.env.REACT_APP_Base_API}/api/getRentalproperties/${propertyId}`, {
      credentials: "include",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
      .then(res => {
        if (res.status === 404) throw new Error("not-found-rental");
        if (!res.ok) throw new Error("Failed to fetch property");
        return res.json();
      })
      .then((data) => {
        setPropertyType("rental");
        function getNestedValue(obj, path) {
          return path.split('.').reduce((acc, part) => acc && acc[part], obj);
        }
        let updated = getInitialFormData(GROUPS_RENTAL);
        for (const key of ALL_FIELDS_RENTAL) {
          const value = getNestedValue(data, key);
          if (value !== undefined && value !== null) {
            if (
              GROUPS_RENTAL.some(
                g => g.fields.some(f => f.key === key && f.type === "array")
              )
            ) {
              updated[key] = Array.isArray(value)
                ? value
                : typeof value === "string"
                ? value.split(",").map(s => s.trim()).filter(Boolean)
                : [];
            } else if (
              GROUPS_RENTAL.some(
                g => g.fields.some(f => f.key === key && f.type === "checkbox")
              )
            ) {
              updated[key] = !!value;
            } else if (
              GROUPS_RENTAL.some(
                g => g.fields.some(f => f.key === key && f.type === "file")
              )
            ) {
              setExistingImages(Array.isArray(value) ? value : []);
            } else {
              updated[key] = value;
            }
          }
        }
        if (updated["totalArea.configuration"]) {
          const match = updated["totalArea.configuration"].toString().match(/(\d+)/);
          if (match) {
            updated["totalArea.configuration"] = `${match[1]} BHK`;
          } else {
            updated["totalArea.configuration"] = updated["totalArea.configuration"].toString().trim().toUpperCase();
          }
        }
        if (updated["Sector"] && typeof updated["Sector"] === 'string') {
          const rawSector = updated["Sector"].trim();
          if (/\bdlf\b/i.test(rawSector)) {
            const spaced = rawSector.replace(/[^a-zA-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
            updated["Sector"] = spaced.replace(/\b(dlf)\b/ig, 'DLF');
          } else {
            const formattedSector = rawSector.replace(/[^a-zA-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
            const sectorMatch = formattedSector.match(/^(?:sector|sec)\s*(\d+)$/i) || formattedSector.match(/^(\d+)$/);
            if (sectorMatch) {
              updated["Sector"] = `Sector-${sectorMatch[1]}`;
            } else {
              updated["Sector"] = formattedSector
                .split(' ')
                .map(w => w ? (w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()) : w)
                .join(' ');
            }
          }
        }
        setFormData(updated);
        // Load panoramas if present (Rental)
        if (Array.isArray(data.panoramas)) {
          setExistingPanos(
            data.panoramas.map(p => ({
              title: p.title || "",
              url: p.url || "",
              yaw: Number(p.yaw) || 0,
              pitch: Number(p.pitch) || 0,
              notes: p.notes || "",
            }))
          );
        } else {
          setExistingPanos([]);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (err.message === "not-found-rental") {
          const token = localStorage.getItem("accessToken");
          fetch(`${process.env.REACT_APP_Base_API}/api/getSaleproperties/${propertyId}`, {
            credentials: "include",
            headers: {
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          })
            .then(res => {
              if (!res.ok) throw new Error("Failed to fetch property");
              return res.json();
            })
            .then((data) => {
              setPropertyType("sale");
              function getNestedValue(obj, path) {
                return path.split('.').reduce((acc, part) => acc && acc[part], obj);
              }
              let updated = getInitialFormData(GROUPS_SALE);
              for (const key of ALL_FIELDS_SALE) {
                const value = getNestedValue(data, key);
                if (value !== undefined && value !== null) {
                  if (
                    GROUPS_SALE.some(
                      g => g.fields.some(f => f.key === key && f.type === "array")
                    )
                  ) {
                    updated[key] = Array.isArray(value)
                      ? value
                      : typeof value === "string"
                      ? value.split(",").map(s => s.trim()).filter(Boolean)
                      : [];
                  } else if (
                    GROUPS_SALE.some(
                      g => g.fields.some(f => f.key === key && f.type === "checkbox")
                    )
                  ) {
                    updated[key] = !!value;
                  } else if (
                    GROUPS_SALE.some(
                      g => g.fields.some(f => f.key === key && f.type === "file")
                    )
                  ) {
                    setExistingImages(Array.isArray(value) ? value : []);
                  } else {
                    updated[key] = value;
                  }
                }
              }
              if (updated["totalArea.configuration"]) {
                const match = updated["totalArea.configuration"].toString().match(/(\d+)/);
                if (match) {
                  updated["totalArea.configuration"] = `${match[1]} BHK`;
                } else {
                  updated["totalArea.configuration"] = updated["totalArea.configuration"].toString().trim().toUpperCase();
                }
              }
              if (updated["Sector"] && typeof updated["Sector"] === 'string') {
                const rawSector = updated["Sector"].trim();
                if (/\bdlf\b/i.test(rawSector)) {
                  const spaced = rawSector.replace(/[^a-zA-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
                  updated["Sector"] = spaced.replace(/\b(dlf)\b/ig, 'DLF');
                } else {
                  const formattedSector = rawSector.replace(/[^a-zA-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
                  const sectorMatch = formattedSector.match(/^(?:sector|sec)\s*(\d+)$/i) || formattedSector.match(/^(\d+)$/);
                  if (sectorMatch) {
                    updated["Sector"] = `Sector-${sectorMatch[1]}`;
                  } else {
                    updated["Sector"] = formattedSector
                      .split(' ')
                      .map(w => w ? (w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()) : w)
                      .join(' ');
                  }
                }
              }
              setFormData(updated);
              // Load panoramas if present (Sale)
              if (Array.isArray(data.panoramas)) {
                setExistingPanos(
                  data.panoramas.map(p => ({
                    title: p.title || "",
                    url: p.url || "",
                    yaw: Number(p.yaw) || 0,
                    pitch: Number(p.pitch) || 0,
                    notes: p.notes || "",
                  }))
                );
              } else {
                setExistingPanos([]);
              }
              setLoading(false);
            })
            .catch((e) => {
              setError(e.message);
              setLoading(false);
            });
        } else {
          setError(err.message);
          setLoading(false);
        }
      });
  }, [isOpen, propertyId]);

  function handleInputChange(e, field) {
    const { value, checked, files } = e.target;
    if (field.type === "checkbox") {
      setFormData(f => ({ ...f, [field.key]: checked }));
    } else if (field.type === "array") {
      setFormData(f => ({
        ...f,
        [field.key]: value.split(",").map(s => s.trim()).filter(Boolean),
      }));
    } else if (field.type === "file") {
      // Reject files larger than 5MB
      const incoming = Array.from(files);
      const oversized = incoming.filter(f => f.size > 5 * 1024 * 1024);
      if (oversized.length > 0) {
        toast.error("❌ One or more files exceed 5MB and were not added.");
        return;
      }
      setNewImages(incoming);
    } else {
      // If user edited bedrooms, auto-update totalArea.configuration to match (e.g., 3 -> "3 BHK")
      if (field.key === 'bedrooms') {
        const num = parseInt(value, 10);
        setFormData(prev => {
          const next = { ...prev, [field.key]: value };
          if (!Number.isNaN(num) && num > 0) {
            next['totalArea.configuration'] = `${num} BHK`;
          } else {
            // clear configuration if bedrooms cleared or invalid
            next['totalArea.configuration'] = '';
          }
          return next;
        });
      } else {
        setFormData(f => ({ ...f, [field.key]: value }));
      }
    }
  }

  function handleRemoveExistingImage(idx) {
    setExistingImages(imgs => imgs.filter((_, i) => i !== idx));
  }

function handlePanoFilesSelected(files) {
  // respect total cap 6 (existing + new)
  const remaining = Math.max(0, 6 - existingPanos.length - newPanos.length);
  const picked = Array.from(files).slice(0, remaining);

  // Reject pano files larger than 5MB
  const oversizedPanos = picked.filter(f => f.size > 5 * 1024 * 1024);
  if (oversizedPanos.length > 0) {
    toast.error("❌ One or more panorama files exceed 5MB and were not added.");
    return;
  }

  const mapped = picked.map((f) => ({ file: f, title: "", yaw: 0, pitch: 0, notes: "" }));
  setNewPanos((prev) => [...prev, ...mapped]);
}

  function updateNewPano(idx, patch) {
    setNewPanos((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function removeExistingPano(idx) {
    setExistingPanos((list) => list.filter((_, i) => i !== idx));
  }

  function removeNewPano(idx) {
    setNewPanos((list) => list.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      let dataToSend = { ...formData };
      dataToSend = sanitizePayload(dataToSend);
      if (dataToSend["totalArea.configuration"]) {
        const match = dataToSend["totalArea.configuration"].toString().match(/(\d+)/);
        if (match) {
          dataToSend["totalArea.configuration"] = `${match[1]} BHK`;
        } else {
          dataToSend["totalArea.configuration"] = dataToSend["totalArea.configuration"].toString().trim().toUpperCase();
        }
      }
      if (dataToSend["totalArea.sqft"] !== undefined || dataToSend["totalArea.configuration"] !== undefined) {
        dataToSend.totalArea = {
          sqft: dataToSend["totalArea.sqft"] || null,
          configuration: dataToSend["totalArea.configuration"] || "",
        };
        delete dataToSend["totalArea.sqft"];
        delete dataToSend["totalArea.configuration"];
      }
      if (dataToSend.totalArea?.configuration) {
        const match = dataToSend.totalArea.configuration.toString().match(/(\d+)/);
        if (match) {
          dataToSend.totalArea.configuration = `${match[1]} BHK`;
        } else {
          dataToSend.totalArea.configuration = dataToSend.totalArea.configuration.toString().trim().toUpperCase();
        }
      }
      const groups = propertyType === "sale" ? GROUPS_SALE : GROUPS_RENTAL;
      const allFields = propertyType === "sale" ? ALL_FIELDS_SALE : ALL_FIELDS_RENTAL;
      // Use multipart when sending any new binary files (normal or pano)
      if (newImages.length > 0 || newPanos.length > 0) {
        const form = new FormData();
        for (const key of allFields) {
          if (key === "images") continue;
          const value = dataToSend[key];
          if (value !== undefined && value !== null) {
            if (Array.isArray(value)) {
              form.append(key, value.join(","));
            } else {
              form.append(key, value.toString());
            }
          }
        }
        if (dataToSend.totalArea) {
          form.append("totalAreaSqft", dataToSend.totalArea.sqft || "");
          form.append("totalAreaConfiguration", dataToSend.totalArea.configuration || "");
        }
        form.append("replaceImages", "true");
        newImages.forEach((img) => form.append("images", img));
        // Append 360° pano files + parallel metadata arrays
        if (newPanos.length > 0) {
          newPanos.forEach((p) => {
            if (p.file) form.append("panoFiles", p.file);
            form.append("panoTitles[]", p.title || "");
            form.append("panoYaw[]", String(Number(p.yaw) || 0));
            form.append("panoPitch[]", String(Number(p.pitch) || 0));
            form.append("panoNotes[]", p.notes || "");
          });
        }

        // If user removed some existing panos and didn't add new ones for them,
        // send current existing panos as JSON to preserve removals
        if (newPanos.length === 0 && existingPanos) {
          try {
            form.append("existingPanos", JSON.stringify(existingPanos));
          } catch (_) {}
        }
        const token = localStorage.getItem("accessToken");
        const res = await fetch(
          `${process.env.REACT_APP_Base_API}/api/admin/update-property/${propertyId}`,
          {
            method: "PUT",
            body: form,
            credentials: "include",
            headers: {
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          }
        );
        if (!res.ok) throw new Error("Failed to update property (image upload)");
      } else {
        let payload = { ...formData, images: existingImages };
        for (const group of groups) {
          for (const field of group.fields) {
            if (field.type === "array") {
              payload[field.key] = Array.isArray(formData[field.key])
                ? formData[field.key]
                : [];
            }
          }
        }
        if (payload["totalArea.configuration"]) {
          const match = payload["totalArea.configuration"].toString().match(/(\d+)/);
          if (match) {
            payload["totalArea.configuration"] = `${match[1]} BHK`;
          } else {
            payload["totalArea.configuration"] = payload["totalArea.configuration"].toString().trim().toUpperCase();
          }
        }
        if (payload["totalArea.sqft"] !== undefined || payload["totalArea.configuration"] !== undefined) {
          payload.totalArea = {
            sqft: payload["totalArea.sqft"] || null,
            configuration: payload["totalArea.configuration"] || "",
          };
          delete payload["totalArea.sqft"];
          delete payload["totalArea.configuration"];
        }
        if (payload.totalArea?.configuration) {
          const match = payload.totalArea.configuration.toString().match(/(\d+)/);
          if (match) {
            payload.totalArea.configuration = `${match[1]} BHK`;
          } else {
            payload.totalArea.configuration = payload.totalArea.configuration.toString().trim().toUpperCase();
          }
        }
        // When not uploading files, include panoramas JSON so removals/edits persist
        if (Array.isArray(existingPanos)) {
          payload.panoramas = existingPanos;
        }
        const token = localStorage.getItem("accessToken");
        const res = await fetch(
          `${process.env.REACT_APP_Base_API}/api/admin/update-property/${propertyId}`,
          {
            method: "PUT",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(payload),
          }
        );
        if (!res.ok) throw new Error("Failed to update property");
      }
      setSubmitting(false);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }
  const groupsMain = (propertyType === "sale" ? GROUPS_SALE : GROUPS_RENTAL).filter((g) => g.name !== "Images");

  const renderGroupCard = (group) => (
    <Box key={group.name} sx={SECTION_CARD}>
      <Typography variant="h3" sx={SECTION_TITLE}>
        {group.name}
      </Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
        {group.fields.map((field) => {
          const wide = field.type === "textarea";
          const span = wide ? { gridColumn: "1 / -1" } : undefined;
          const shared = {
            id: field.key,
            label: field.label,
            value: field.type === "array" ? formatArrayValue(formData[field.key]) : formData[field.key] ?? "",
            onChange: (e) => handleInputChange(e, field),
            fullWidth: true,
          };

          if (field.type === "select") {
            return (
              <Box key={field.key} sx={span}>
                <TextField {...shared} select SelectProps={{ native: true }} InputLabelProps={{ shrink: true }}>
                  <option value="">Select</option>
                  {field.options?.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt.charAt(0).toUpperCase() + opt.slice(1)}
                    </option>
                  ))}
                </TextField>
              </Box>
            );
          }

          if (field.type === "checkbox") {
            return (
              <Box key={field.key} sx={span}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={!!formData[field.key]}
                      onChange={(e) => handleInputChange(e, field)}
                      inputProps={{ id: field.key }}
                    />
                  }
                  label={field.label}
                />
              </Box>
            );
          }

          if (field.type === "textarea") {
            return (
              <Box key={field.key} sx={span}>
                <TextField {...shared} multiline minRows={4} />
              </Box>
            );
          }

          if (field.type === "array") {
            return (
              <Box key={field.key} sx={span}>
                <TextField {...shared} helperText="Comma-separated values" />
              </Box>
            );
          }

          return (
            <Box key={field.key} sx={span}>
              <TextField
                {...shared}
                type={field.type}
                {...(field.type === "date" ? { InputLabelProps: { shrink: true } } : {})}
                inputProps={field.type === "number" ? { min: 0, inputMode: "numeric" } : undefined}
              />
            </Box>
          );
        })}
      </Box>
    </Box>
  );

  const ImagesCard = (
    <Box sx={SECTION_CARD}>
      <Typography variant="h3" sx={SECTION_TITLE}>
        Property Images
      </Typography>

      <Box sx={{ mb: 3 }}>
        <Typography variant="caption" sx={CAPTION}>
          Upload New Images
        </Typography>
        <Box
          component="div"
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onMouseEnter={() => setUploadHover(true)}
          onMouseLeave={() => setUploadHover(false)}
          sx={{
            textAlign: "center",
            border: "2px dashed",
            borderColor: uploadHover ? "#00A79D" : "#CBD5E1",
            borderRadius: "12px",
            py: 5,
            px: 3,
            cursor: "pointer",
            bgcolor: uploadHover ? "rgba(0,167,157,0.06)" : "#F8FAFC",
            transition: "all 0.2s",
            "&:focus-visible": { outline: "2px solid #00A79D", outlineOffset: 2 },
          }}
        >
          <Box
            component="input"
            type="file"
            multiple
            accept="image/*"
            ref={fileInputRef}
            onChange={(e) => handleInputChange(e, { key: "images", type: "file", multiple: true })}
            sx={{ display: "none" }}
          />
          <Stack alignItems="center" spacing={1}>
            <Upload size={30} color="#00A79D" />
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Click or drag images to upload
            </Typography>
          </Stack>
        </Box>
      </Box>

      {existingImages.length > 0 || newImages.length > 0 ? (
        <Box>
          <Typography variant="caption" sx={CAPTION}>
            Current Images ({existingImages.length + newImages.length})
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(3, 1fr)" },
              gap: 1.5,
              maxHeight: 400,
              overflowY: "auto",
            }}
          >
            {existingImages.map((img, idx) => (
              <Box key={img + idx} sx={{ position: "relative", borderRadius: "8px", overflow: "hidden", border: "2px solid #E5E9EE", aspectRatio: "1 / 1" }}>
                <Box
                  component="img"
                  src={typeof img === "string" ? img : ""}
                  alt={`Property ${idx + 1}`}
                  sx={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                />
                <IconButton
                  aria-label="Remove image"
                  onClick={() => handleRemoveExistingImage(idx)}
                  sx={{
                    position: "absolute",
                    top: 4,
                    right: 4,
                    width: 44,
                    height: 44,
                    bgcolor: "rgba(255,255,255,0.95)",
                    color: "#DC2626",
                    "&:hover": { bgcolor: "#FFFFFF" },
                  }}
                >
                  <X size={18} />
                </IconButton>
              </Box>
            ))}
            {newImages.map((img, idx) => (
              <Box key={img.name + idx} sx={{ position: "relative", borderRadius: "8px", overflow: "hidden", border: "2px solid #10B981", aspectRatio: "1 / 1" }}>
                <Box
                  component="img"
                  src={URL.createObjectURL(img)}
                  alt={`New ${idx + 1}`}
                  sx={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                />
                <Chip
                  label="NEW"
                  size="small"
                  sx={{ position: "absolute", top: 6, left: 6, height: 22, fontWeight: 700, bgcolor: "#10B981", color: "#FFFFFF" }}
                />
              </Box>
            ))}
          </Box>
        </Box>
      ) : (
        <EmptyState
          icon={ImagePlus}
          title="No images yet"
          description="Upload images above — they appear here before you save."
        />
      )}
    </Box>
  );

  const PanoCard = (
    <Box sx={SECTION_CARD}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2.5, pb: 2, borderBottom: "2px solid #22D3EE" }}>
        <Typography variant="h3" sx={{ fontWeight: 700, color: "primary.main", fontSize: "1rem", m: 0 }}>
          360° Panoramic Scenes
        </Typography>
        <Chip
          label={`${existingPanos.length + newPanos.length}/6`}
          size="small"
          sx={{ fontWeight: 700, borderRadius: "999px", bgcolor: "rgba(0,51,102,0.08)", color: "primary.main" }}
        />
      </Stack>

      {existingPanos.length > 0 && (
        <Box sx={{ mb: 2.5 }}>
          <Typography variant="caption" sx={CAPTION}>
            Existing Scenes
          </Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
            {existingPanos.map((p, idx) => (
              <Box key={idx} sx={{ position: "relative", border: "1px solid", borderColor: "divider", borderRadius: "8px", overflow: "hidden", bgcolor: "#FFFFFF" }}>
                <Box component="img" src={p.url} alt={p.title || `scene-${idx + 1}`} sx={{ width: "100%", height: 96, objectFit: "cover", display: "block" }} />
                <Box sx={{ p: 1.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                    {p.title || `Scene ${idx + 1}`}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    Yaw {p.yaw || 0}°, Pitch {p.pitch || 0}°
                  </Typography>
                </Box>
                <Button
                  size="small"
                  onClick={() => removeExistingPano(idx)}
                  sx={{
                    position: "absolute",
                    top: 4,
                    right: 4,
                    minHeight: 44,
                    minWidth: 0,
                    px: 1.5,
                    bgcolor: "rgba(255,255,255,0.95)",
                    color: "#DC2626",
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    "&:hover": { bgcolor: "#FFFFFF" },
                  }}
                >
                  Remove
                </Button>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      <Box sx={{ mb: 2.5 }}>
        <Typography variant="caption" sx={CAPTION}>
          Upload New 360° Images
        </Typography>
        <Box
          component="div"
          role="button"
          tabIndex={0}
          onClick={() => panoInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              panoInputRef.current?.click();
            }
          }}
          onMouseEnter={() => setUploadHover(true)}
          onMouseLeave={() => setUploadHover(false)}
          sx={{
            textAlign: "center",
            border: "2px dashed",
            borderColor: uploadHover ? "#00A79D" : "#CBD5E1",
            borderRadius: "12px",
            py: 4,
            px: 3,
            cursor: "pointer",
            bgcolor: uploadHover ? "rgba(0,167,157,0.06)" : "#F8FAFC",
            transition: "all 0.2s",
            "&:focus-visible": { outline: "2px solid #00A79D", outlineOffset: 2 },
          }}
        >
          <Box
            component="input"
            type="file"
            multiple
            accept="image/*"
            ref={panoInputRef}
            onChange={(e) => handlePanoFilesSelected(e.target.files)}
            sx={{ display: "none" }}
          />
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Click or drag to add up to {Math.max(0, 6 - (existingPanos.length + newPanos.length))} scenes
          </Typography>
        </Box>
      </Box>

      {newPanos.length > 0 && (
        <Box>
          <Typography variant="caption" sx={CAPTION}>
            New Scenes
          </Typography>
          {newPanos.map((p, idx) => {
            const url = p.file ? URL.createObjectURL(p.file) : null;
            return (
              <Box
                key={idx}
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "110px 1fr" },
                  gap: 1.5,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: "8px",
                  p: 1.5,
                  mb: 1.5,
                  bgcolor: "#F8FAFC",
                }}
              >
                <Box>
                  {url ? (
                    <Box
                      component="img"
                      src={url}
                      alt={`new-${idx}`}
                      onLoad={() => URL.revokeObjectURL(url)}
                      sx={{ width: { xs: "100%", sm: 110 }, height: 76, objectFit: "cover", borderRadius: "6px" }}
                    />
                  ) : (
                    <Box sx={{ width: { xs: "100%", sm: 110 }, height: 76, bgcolor: "#E5E9EE", borderRadius: "6px" }} />
                  )}
                </Box>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
                  <TextField size="small" label="Title" placeholder="e.g., Living Room" value={p.title} onChange={(e) => updateNewPano(idx, { title: e.target.value })} />
                  <TextField size="small" type="number" label="Yaw" value={p.yaw} onChange={(e) => updateNewPano(idx, { yaw: e.target.value })} />
                  <TextField size="small" type="number" label="Pitch" value={p.pitch} onChange={(e) => updateNewPano(idx, { pitch: e.target.value })} />
                  <TextField size="small" label="Notes" value={p.notes} onChange={(e) => updateNewPano(idx, { notes: e.target.value })} />
                  <Stack direction="row" justifyContent="flex-end" sx={{ gridColumn: "1 / -1" }}>
                    <Button variant="outlined" color="error" onClick={() => removeNewPano(idx)} sx={{ minHeight: 44 }}>
                      Remove
                    </Button>
                  </Stack>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      fullScreen={isMobile}
      fullWidth
      maxWidth="lg"
      scroll="paper"
      aria-labelledby="edit-property-title"
      slotProps={{ paper: { sx: { borderRadius: isMobile ? 0 : "16px", maxHeight: "92vh", display: "flex", flexDirection: "column" } } }}
    >
      <DialogTitle
        id="edit-property-title"
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          px: { xs: 2, sm: 3 },
          py: 1.5,
          borderBottom: "1px solid",
          borderColor: "divider",
          fontWeight: 700,
          color: "primary.main",
          fontSize: "1.15rem",
        }}
      >
        Edit Property
        <IconButton aria-label="Close" onClick={onClose} sx={{ width: 44, height: 44 }}>
          <X size={22} color="#5B6B7B" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ flex: 1, overflowY: "auto", minHeight: 0, p: { xs: 2, sm: 3 } }}>
        {loading ? (
          <Stack spacing={2}>
            {[...Array(6)].map((_, i) => (
              <Box key={i}>
                <Skeleton variant="text" width="30%" height={24} />
                <Skeleton variant="rounded" height={56} sx={{ borderRadius: "8px" }} />
              </Box>
            ))}
          </Stack>
        ) : error ? (
          <Alert severity="error" sx={{ borderRadius: "8px" }}>
            {error}
          </Alert>
        ) : (
          <form id="edit-property-form" onSubmit={handleSubmit}>
            {!isMobile ? (
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3, alignItems: "start" }}>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>{groupsMain.map(renderGroupCard)}</Box>
                <Box sx={{ position: { md: "sticky" }, top: 0, alignSelf: "start", display: "flex", flexDirection: "column", gap: 3 }}>
                  {ImagesCard}
                  {PanoCard}
                </Box>
              </Box>
            ) : (
              <Box>
                <Box sx={{ display: "flex", justifyContent: "center", gap: 1, mb: 2 }}>
                  {Array.from({ length: groupsMain.length + 2 }).map((_, i) => (
                    <Box key={i} sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: i === page ? "primary.main" : "divider" }} />
                  ))}
                </Box>

                {page < groupsMain.length ? renderGroupCard(groupsMain[page]) : page === groupsMain.length ? ImagesCard : PanoCard}

                <Stack direction="row" justifyContent="space-between" sx={{ mt: 3 }}>
                  <Button
                    type="button"
                    variant="outlined"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    sx={{ minHeight: 44, minWidth: 110, borderColor: "divider", color: "text.secondary" }}
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    variant="contained"
                    onClick={() => setPage((p) => Math.min(groupsMain.length + 1, p + 1))}
                    disabled={page === groupsMain.length + 1}
                    sx={{ minHeight: 44, minWidth: 110, bgcolor: "#003366", "&:hover": { bgcolor: "#002244" } }}
                  >
                    Next
                  </Button>
                </Stack>
              </Box>
            )}
          </form>
        )}
      </DialogContent>

      {!loading && !error && (
        <DialogActions
          sx={{
            px: { xs: 2, sm: 3 },
            py: 2,
            borderTop: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
            justifyContent: "flex-end",
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <Button
            type="button"
            variant="outlined"
            onClick={onClose}
            disabled={submitting}
            sx={{ minHeight: 44, minWidth: 120, borderColor: "divider", color: "text.secondary", fontWeight: 700 }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="edit-property-form"
            variant="contained"
            disabled={submitting}
            sx={{ minHeight: 44, minWidth: 160, fontWeight: 700, bgcolor: "#003366", "&:hover": { bgcolor: "#002244" } }}
          >
            {submitting ? "Saving Changes..." : "Save Changes"}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
}
