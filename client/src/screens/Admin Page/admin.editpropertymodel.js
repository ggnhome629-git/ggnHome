import React, { useEffect, useState, useRef } from "react";
import { toast } from 'react-toastify';

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
  const modalRef = useRef(null);
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
    if (!isOpen) return;
    function onKeyDown(e) {
      if (e.key === "Escape") onClose();
    }
    function onClick(e) {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onClick);
    };
  }, [isOpen, onClose]);

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
    const { type, value, checked, files } = e.target;
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

  if (!isOpen) return null;

  const groupsMain = (propertyType === 'sale' ? GROUPS_SALE : GROUPS_RENTAL)
    .filter(g => g.name !== 'Images');

  const renderGroupCard = (group) => (
    <div
      key={group.name}
      style={{
        background: '#fff',
        borderRadius: 12,
        padding: '20px 24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      }}
    >
      <div
        style={{
          fontWeight: 600,
          fontSize: 16,
          marginBottom: 18,
          color: '#495057',
          paddingBottom: 12,
          borderBottom: '2px solid #e9ecef',
        }}
      >
        {group.name}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {group.fields.map((field) => (
          <div key={field.key} style={{ gridColumn: field.type === 'textarea' ? '1 / -1' : 'auto' }}>
            <label htmlFor={field.key} style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#495057', marginBottom: 6 }}>
              {field.label}
            </label>
            {field.type === 'select' ? (
              <select
                id={field.key}
                value={formData[field.key]}
                onChange={(e) => handleInputChange(e, field)}
                style={{ width: '100%', border: '1px solid #ced4da', borderRadius: 6, padding: '9px 12px', fontSize: 14, background: '#fff', color: '#495057' }}
              >
                <option value=''>Select</option>
                {field.options?.map((opt) => (
                  <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
                ))}
              </select>
            ) : field.type === 'textarea' ? (
              <textarea
                id={field.key}
                value={formData[field.key]}
                onChange={(e) => handleInputChange(e, field)}
                rows={4}
                style={{ width: '100%', border: '1px solid #ced4da', borderRadius: 6, padding: '9px 12px', fontSize: 14, background: '#fff', color: '#495057', resize: 'vertical' }}
              />
            ) : field.type === 'checkbox' ? (
              <div style={{ display: 'flex', alignItems: 'center', marginTop: 8 }}>
                <input id={field.key} type='checkbox' checked={!!formData[field.key]} onChange={(e) => handleInputChange(e, field)} style={{ width: 18, height: 18, cursor: 'pointer' }} />
              </div>
            ) : field.type === 'array' ? (
              <input
                id={field.key}
                type='text'
                value={formatArrayValue(formData[field.key])}
                placeholder='Comma-separated values'
                onChange={(e) => handleInputChange(e, field)}
                style={{ width: '100%', border: '1px solid #ced4da', borderRadius: 6, padding: '9px 12px', fontSize: 14, background: '#fff', color: '#495057' }}
              />
            ) : (
              <input
                id={field.key}
                type={field.type}
                value={formData[field.key]}
                onChange={(e) => handleInputChange(e, field)}
                style={{ width: '100%', border: '1px solid #ced4da', borderRadius: 6, padding: '9px 12px', fontSize: 14, background: '#fff', color: '#495057' }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const ImagesCard = (
    <div
      style={{
        background: '#fff',
        borderRadius: 12,
        padding: '20px 24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        position: 'relative'
      }}
    >
      <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 18, color: '#495057', paddingBottom: 12, borderBottom: '2px solid #e9ecef' }}>
        Property Images
      </div>
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#495057', marginBottom: 8 }}>Upload New Images</label>
        <div
          style={{ textAlign: 'center', border: uploadHover ? '2px dashed #007bff' : '2px dashed #ced4da', borderRadius: 12, padding: '40px 20px', cursor: 'pointer', background: uploadHover ? '#e9f5ff' : '#f8f9fa', transition: 'all 0.3s' }}
          onMouseEnter={() => setUploadHover(true)}
          onMouseLeave={() => setUploadHover(false)}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type='file'
            multiple
            accept='image/*'
            onChange={(e) => handleInputChange(e, { key: 'images', type: 'file', multiple: true })}
            style={{ display: 'none' }}
            ref={fileInputRef}
          />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <svg width='36' height='36' fill='#007bff' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path d='M12 16a1 1 0 0 1-1-1V9.41l-1.3 1.3a1 1 0 0 1-1.4-1.42l3-3a1 1 0 0 1 1.4 0l3 3a1 1 0 1 1-1.4 1.42L13 9.41V15a1 1 0 0 1-1 1Zm8-4a1 1 0 0 1 0 2h-1v4a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-4H4a1 1 0 0 1 0-2h16ZM7 18h10v-4H7v4Z'/></svg>
            <span style={{ fontSize: 14, color: '#6c757d' }}>Click or drag images to upload</span>
          </div>
        </div>
      </div>

      {(existingImages.length > 0 || newImages.length > 0) ? (
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#495057', marginBottom: 12 }}>Current Images ({existingImages.length + newImages.length})</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, maxHeight: 400, overflowY: 'auto', padding: 4 }}>
            {existingImages.map((img, idx) => (
              <div key={img + idx} style={{ position: 'relative', paddingBottom: '100%', borderRadius: 8, overflow: 'hidden', border: '2px solid #e9ecef' }}>
                <img src={typeof img === 'string' ? img : ''} alt={`Property ${idx + 1}`} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                <button type='button' onClick={() => handleRemoveExistingImage(idx)} style={{ position: 'absolute', top: 4, right: 4, border: 'none', background: 'rgba(255, 255, 255, 0.95)', borderRadius: '50%', width: 24, height: 24, fontSize: 16, color: '#dc3545', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }} aria-label='Remove image'>×</button>
              </div>
            ))}
            {newImages.map((img, idx) => (
              <div key={img.name + idx} style={{ position: 'relative', paddingBottom: '100%', borderRadius: 8, overflow: 'hidden', border: '2px solid #28a745' }}>
                <img src={URL.createObjectURL(img)} alt={`New ${idx + 1}`} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', top: 4, left: 4, background: '#28a745', color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>NEW</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#adb5bd', fontSize: 14 }}>No images uploaded yet</div>
      )}
    </div>
  );

  const PanoCard = (
    <div
      style={{
        background: '#fff',
        borderRadius: 12,
        padding: '20px 24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        marginTop: 16,
      }}
    >
      <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 10, color: '#495057', paddingBottom: 12, borderBottom: '2px solid #e9ecef', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>360° Panoramic Scenes</span>
        <span style={{ fontSize: 12, color: '#6c757d' }}>{existingPanos.length + newPanos.length}/6</span>
      </div>

      {existingPanos.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#495057', marginBottom: 8 }}>Existing Scenes</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {existingPanos.map((p, idx) => (
              <div key={idx} style={{ position: 'relative', border: '1px solid #e9ecef', borderRadius: 8, overflow: 'hidden' }}>
                <img src={p.url} alt={p.title || `scene-${idx+1}`} style={{ width: '100%', height: 90, objectFit: 'cover' }} />
                <div style={{ padding: 8, fontSize: 12, color: '#495057' }}>
                  <div style={{ fontWeight: 600, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{p.title || `Scene ${idx+1}`}</div>
                  <div style={{ opacity: .7 }}>Yaw {p.yaw || 0}°, Pitch {p.pitch || 0}°</div>
                </div>
                <button type='button' onClick={() => removeExistingPano(idx)} style={{ position: 'absolute', top: 6, right: 6, background: '#fff', border: '1px solid #e9ecef', borderRadius: 6, padding: '2px 8px', fontSize: 12, cursor: 'pointer', color: '#dc3545' }}>Remove</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#495057', marginBottom: 8 }}>Upload New 360° Images</label>
        <div
          style={{ textAlign: 'center', border: uploadHover ? '2px dashed #0d6efd' : '2px dashed #ced4da', borderRadius: 12, padding: '24px 16px', cursor: 'pointer', background: uploadHover ? '#e9f5ff' : '#f8f9fa', transition: 'all 0.3s' }}
          onMouseEnter={() => setUploadHover(true)}
          onMouseLeave={() => setUploadHover(false)}
          onClick={() => panoInputRef.current?.click()}
        >
          <input type='file' multiple accept='image/*' onChange={(e) => handlePanoFilesSelected(e.target.files)} style={{ display: 'none' }} ref={panoInputRef} />
          <div style={{ fontSize: 13, color: '#6c757d' }}>Click or drag to add up to {Math.max(0, 6 - (existingPanos.length + newPanos.length))} scenes</div>
        </div>
      </div>

      {newPanos.length > 0 && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#495057', marginBottom: 8 }}>New Scenes</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
            {newPanos.map((p, idx) => {
              const url = p.file ? URL.createObjectURL(p.file) : null;
              return (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 12, border: '1px solid #e9ecef', borderRadius: 8, padding: 10 }}>
                  <div>
                    {url ? (
                      <img src={url} alt={`new-${idx}`} style={{ width: 100, height: 70, objectFit: 'cover', borderRadius: 6 }} onLoad={() => URL.revokeObjectURL(url)} />
                    ) : (
                      <div style={{ width: 100, height: 70, background: '#e9ecef', borderRadius: 6 }} />
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <input type='text' placeholder='Title (e.g., Living Room)' value={p.title} onChange={(e)=>updateNewPano(idx,{ title: e.target.value })} style={{ border: '1px solid #ced4da', borderRadius: 6, padding: '8px 10px', fontSize: 13 }} />
                    <input type='number' placeholder='Yaw' value={p.yaw} onChange={(e)=>updateNewPano(idx,{ yaw: e.target.value })} style={{ border: '1px solid #ced4da', borderRadius: 6, padding: '8px 10px', fontSize: 13 }} />
                    <input type='number' placeholder='Pitch' value={p.pitch} onChange={(e)=>updateNewPano(idx,{ pitch: e.target.value })} style={{ border: '1px solid #ced4da', borderRadius: 6, padding: '8px 10px', fontSize: 13 }} />
                    <input type='text' placeholder='Notes' value={p.notes} onChange={(e)=>updateNewPano(idx,{ notes: e.target.value })} style={{ border: '1px solid #ced4da', borderRadius: 6, padding: '8px 10px', fontSize: 13 }} />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gridColumn: '1 / -1' }}>
                      <button type='button' onClick={()=>removeNewPano(idx)} style={{ background: '#fff', border: '1px solid #e9ecef', color: '#dc3545', borderRadius: 6, padding: '6px 10px', fontSize: 12, cursor: 'pointer' }}>Remove</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  const groupsToRender = propertyType === "sale" ? GROUPS_SALE : GROUPS_RENTAL;

  return (
    <div
      style={{
        position: "fixed",
        zIndex: 1000,
        left: 0,
        top: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        ref={modalRef}
        style={{
          background: "#f8f9fa",
          borderRadius: "16px",
          maxWidth: "1100px",
          width: "100%",
          maxHeight: "92vh",
          overflowY: "auto",
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            background: "#fff",
            padding: "20px 32px",
            borderBottom: "1px solid #e9ecef",
            borderRadius: "16px 16px 0 0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          <h2 style={{ margin: 0, fontWeight: 600, fontSize: 22, color: "#212529" }}>
            Edit Property
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: 28,
              cursor: "pointer",
              color: "#6c757d",
              fontWeight: 400,
              lineHeight: 1,
              padding: 0,
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading ? (
            <div style={{ padding: 60, textAlign: "center", color: "#6c757d" }}>
              Loading property details...
            </div>
          ) : error ? (
            <div
              style={{
                margin: "24px 32px",
                padding: "16px 20px",
                background: "#fff3cd",
                border: "1px solid #ffc107",
                borderRadius: 8,
                color: "#856404",
              }}
            >
              {error}
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ padding: "24px 32px" }}>
              {!isMobile ? (
                // Desktop: two-column layout, both Images and Pano in the right column
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {groupsMain.map(renderGroupCard)}
                  </div>
                  <div style={{ position: isMobile ? 'relative' : 'sticky', top: isMobile ? undefined : 100, alignSelf: 'start' }}>
                    {ImagesCard}
                    {PanoCard}
                  </div>
                </div>
              ) : (
                // Mobile: paginated pages
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 8 }}>
                    {Array.from({ length: groupsMain.length + 2 }).map((_, i) => (
                      <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: i === page ? '#007bff' : '#ced4da' }} />
                    ))}
                  </div>

                  <div>
                    {page < groupsMain.length ? (
                      renderGroupCard(groupsMain[page])
                    ) : page === groupsMain.length ? (
                      ImagesCard
                    ) : (
                      PanoCard
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <button
                      type='button'
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                      style={{ background: '#f8f9fa', color: '#495057', border: '1px solid #ced4da', borderRadius: 8, padding: '10px 16px', fontSize: 14, fontWeight: 500, cursor: page === 0 ? 'not-allowed' : 'pointer' }}
                    >
                      Back
                    </button>
                    <button
                      type='button'
                      onClick={() => setPage((p) => Math.min(groupsMain.length + 1, p + 1))}
                      disabled={page === groupsMain.length + 1}
                      style={{ background: '#007bff', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 14, fontWeight: 500, cursor: page === groupsMain.length + 1 ? 'not-allowed' : 'pointer' }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </form>
          )}
        </div>

        {/* Footer */}
        {!loading && !error && (
          <div
            style={{
              background: "#fff",
              padding: "16px 32px",
              borderTop: "1px solid #e9ecef",
              borderRadius: "0 0 16px 16px",
              display: "flex",
              justifyContent: "flex-end",
              gap: 12,
              position: "sticky",
              bottom: 0,
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "#f8f9fa",
                color: "#495057",
                border: "1px solid #ced4da",
                borderRadius: 8,
                padding: "10px 24px",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              disabled={submitting}
              onMouseOver={(e) => {
                if (!submitting) e.target.style.background = "#e9ecef";
              }}
              onMouseOut={(e) => {
                e.target.style.background = "#f8f9fa";
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              style={{
                background: "#007bff",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "10px 32px",
                fontSize: 14,
                fontWeight: 500,
                cursor: submitting ? "not-allowed" : "pointer",
                opacity: submitting ? 0.6 : 1,
                transition: "all 0.2s",
              }}
              disabled={submitting}
              onMouseOver={(e) => {
                if (!submitting) e.target.style.background = "#0056b3";
              }}
              onMouseOut={(e) => {
                if (!submitting) e.target.style.background = "#007bff";
              }}
            >
              {submitting ? "Saving Changes..." : "Save Changes"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}