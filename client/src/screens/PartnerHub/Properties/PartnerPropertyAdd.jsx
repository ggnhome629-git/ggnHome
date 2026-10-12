import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert, Box, Button, Card, CardContent, Chip, Container, Divider,
  Grid, MenuItem, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography
} from "@mui/material";
import { ArrowLeft, CheckCircle2, ImagePlus, MapPin, Send } from "lucide-react";

const amenityTypes = [
  ["market", "Nearest market"], ["metro", "Metro station"], ["hospital", "Hospital"],
  ["school", "School"], ["park", "Park"], ["mall", "Shopping mall"],
  ["bus", "Bus stop"], ["pharmacy", "Pharmacy"]
];
const initialAmenities = amenityTypes.map(([category, label]) => ({ category, label, name: "", distance: "", source: "partner" }));
const fieldSx = { "& .MuiOutlinedInput-root": { borderRadius: 2, backgroundColor: "#fff" } };

export default function PartnerPropertyAdd() {
  const navigate = useNavigate();
  const [purpose, setPurpose] = useState("rental");
  const [form, setForm] = useState({ title: "", propertyType: "apartment", mobile: "", address: "", sector: "", price: "", bedrooms: "2", bathrooms: "1", area: "", floor: "", totalFloors: "", cornerPosition: "not_sure", petPolicy: "not_sure", furnishing: "unfurnished", parking: "", latitude: "", longitude: "" });
  const [photos, setPhotos] = useState([]);
  const [amenities, setAmenities] = useState(initialAmenities);
  const [busy, setBusy] = useState(false);
  const [finding, setFinding] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const token = localStorage.getItem("partnerAccessToken");
  const api = process.env.REACT_APP_Base_API;
  const change = (key) => (e) => setForm(prev => ({ ...prev, [key]: e.target.value }));
  const addPhotos = (e) => {
    const selected = Array.from(e.target.files || []).filter(f => f.type.startsWith("image/"));
    setPhotos(prev => [...prev, ...selected.map(file => ({ file, category: "other", id: `${file.name}-${file.lastModified}-${Math.random()}` }))].slice(0, 18));
    e.target.value = "";
  };
  const updatePhoto = (id, key, value) => setPhotos(prev => prev.map(p => p.id === id ? { ...p, [key]: value } : p));
  const removePhoto = id => setPhotos(prev => prev.filter(p => p.id !== id));
  const detectAmenities = async () => {
    if (!form.address.trim() && !form.sector.trim()) { setMessage("Enter the address or sector first."); return; }
    setFinding(true); setMessage("");
    try {
      const keyResponse = await fetch(`${api}/api/locationqapi`);
      const keyData = await keyResponse.json();
      if (!keyResponse.ok || !keyData.apiKey) throw new Error("Location service unavailable. You can enter nearby places manually.");
      const query = [form.address, form.sector, "Gurugram, Haryana, India"].filter(Boolean).join(", ");
      const geoResponse = await fetch(`https://us1.locationiq.com/v1/search.php?key=${encodeURIComponent(keyData.apiKey)}&q=${encodeURIComponent(query)}&format=json&limit=1`);
      const geo = await geoResponse.json();
      if (!geoResponse.ok || !geo?.[0]) throw new Error("Address not found. Add a more complete address.");
      const lat = Number(geo[0].lat), lon = Number(geo[0].lon);
      setForm(prev => ({ ...prev, latitude: String(lat), longitude: String(lon) }));
      const nearResponse = await fetch(`https://us1.locationiq.com/v1/nearby.php?key=${encodeURIComponent(keyData.apiKey)}&lat=${lat}&lon=${lon}&tag=amenity,shop,leisure,railway,public_transport,healthcare,education&radius=3000&format=json`);
      const places = await nearResponse.json();
      if (!nearResponse.ok || !Array.isArray(places)) throw new Error("Nearby lookup failed. You can enter amenities manually.");
      const meters = (p) => {
        const rad = n => n * Math.PI / 180, dLat = rad(Number(p.lat)-lat), dLon = rad(Number(p.lon)-lon);
        const a = Math.sin(dLat/2)**2 + Math.cos(rad(lat))*Math.cos(rad(Number(p.lat)))*Math.sin(dLon/2)**2;
        return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      };
      const match = { market:/market|supermarket|grocery|convenience/i, metro:/metro|subway/i, hospital:/hospital|clinic/i, school:/school|college|university/i, park:/park|garden|playground/i, mall:/mall|shopping centre|department store/i, bus:/bus stop|bus station/i, pharmacy:/pharmacy|chemist/i };
      setAmenities(prev => prev.map(a => {
        const found = places.filter(p => p.lat && p.lon && match[a.category].test(`${p.name||""} ${p.type||""} ${p.class||""}`)).sort((x,y)=>meters(x)-meters(y))[0];
        return found ? { ...a, name: found.name || a.label, distance: String(Math.round(meters(found))), source: "locationiq" } : a;
      }));
      setMessage("Nearby suggestions loaded. Review and edit them; distances are straight-line estimates.");
    } catch (e) { setMessage(e.message || "Could not detect nearby places."); }
    finally { setFinding(false); }
  };
  const publish = async (e) => {
    e.preventDefault(); setError(""); setMessage("");
    if (!token) { setError("Partner session not found. Please sign in again."); return; }
    if (!form.mobile.trim() || !form.address.trim() || !form.sector.trim()) { setError("Mobile number, full address and sector/locality are required."); return; }
    if (!(Number(form.price)>0) || !(Number(form.area)>0)) { setError("Enter a valid price and area."); return; }
    if (!photos.some(p => p.category === "front")) { setError("Add at least one Front / Exterior photo."); return; }
    if (form.floor !== "" && form.totalFloors !== "" && Number(form.floor)>Number(form.totalFloors)) { setError("Floor number cannot exceed total floors."); return; }
    setBusy(true);
    try {
      const data = new FormData();
      Object.entries({ ...form, purpose }).forEach(([key,value]) => data.append(key, value));
      data.append("imageCategories", JSON.stringify(photos.map(p=>p.category)));
      data.append("amenities", JSON.stringify(amenities.filter(a=>a.name.trim() || a.distance !== "").map(a=>({ category:a.category, name:a.name, distance:a.distance, source:a.source, edited:a.source==="locationiq" }))));
      photos.forEach(p=>data.append("images", p.file));
      const response = await fetch(`${api}/api/partner/properties`, { method:"POST", headers:{ Authorization:`Bearer ${token}` }, body:data, credentials:"include" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Could not publish property.");
      setMessage("Property published successfully!");
      setTimeout(() => navigate("/partner/properties"), 900);
    } catch(e) { setError(e.message || "Could not publish property."); }
    finally { setBusy(false); }
  };

  return <Container maxWidth="md" sx={{ py:{xs:2,md:5}, background:"#f8fafc", minHeight:"100vh" }}>
    <Button startIcon={<ArrowLeft size={18}/>} onClick={()=>navigate("/partner/properties")} sx={{mb:2,textTransform:"none"}}>Back to properties</Button>
    <Stack spacing={1} sx={{mb:3}}>
      <Typography variant="h4" sx={{fontWeight:800,color:"#0f172a"}}>Add a property</Typography>
      <Typography color="text.secondary">Share the essentials, add photos and publish your listing.</Typography>
      <Stack direction="row" spacing={1}><Chip label="PartnerHub" size="small"/><Chip icon={<CheckCircle2 size={14}/>} label="Publish immediately" color="success" size="small"/></Stack>
    </Stack>
    {error && <Alert severity="error" sx={{mb:2}}>{error}</Alert>}
    {message && <Alert severity="info" sx={{mb:2}}>{message}</Alert>}
    <Box component="form" onSubmit={publish}>
      <Stack spacing={2.5}>
        <Card variant="outlined" sx={{borderRadius:3}}><CardContent sx={{p:{xs:2,md:3}}}>
          <Typography variant="h6" fontWeight={750} mb={2}>1. Listing type</Typography>
          <ToggleButtonGroup exclusive fullWidth value={purpose} onChange={(_,v)=>v&&setPurpose(v)} sx={{mb:2,"& .MuiToggleButton-root":{py:1.2,textTransform:"none",fontWeight:700}}}>
            <ToggleButton value="rental">For rent</ToggleButton><ToggleButton value="sale">For sale</ToggleButton>
          </ToggleButtonGroup>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth select label="Property type" value={form.propertyType} onChange={change("propertyType")} sx={fieldSx}>{["apartment","house","villa","builder-floor","studio","plot","condo","townhouse"].map(v=><MenuItem key={v} value={v}>{v.replace("-"," ").replace(/^./,c=>c.toUpperCase())}</MenuItem>)}</TextField></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Listing title (optional)" value={form.title} onChange={change("title")} placeholder="e.g. Spacious 2 BHK near metro" sx={fieldSx}/></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField required fullWidth label={purpose==="rental"?"Monthly rent (₹)":"Sale price (₹)"} type="number" inputProps={{min:1}} value={form.price} onChange={change("price")} sx={fieldSx}/></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField required fullWidth label="Contact mobile number" value={form.mobile} onChange={change("mobile")} sx={fieldSx}/></Grid>
          </Grid>
        </CardContent></Card>
        <Card variant="outlined" sx={{borderRadius:3}}><CardContent sx={{p:{xs:2,md:3}}}>
          <Typography variant="h6" fontWeight={750} mb={2}>2. Location</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}><TextField required fullWidth label="Sector / locality" value={form.sector} onChange={change("sector")} sx={fieldSx}/></Grid>
            <Grid size={{ xs: 12 }}><TextField required fullWidth multiline minRows={2} label="Full property address" value={form.address} onChange={change("address")} sx={fieldSx}/></Grid>
          </Grid>
          <Button onClick={detectAmenities} disabled={finding} startIcon={<MapPin size={17}/>} variant="outlined" sx={{mt:2,textTransform:"none"}}>{finding?"Finding nearby places…":"Auto-detect nearby amenities"}</Button>
          <Typography variant="caption" display="block" color="text.secondary" sx={{mt:1}}>Detected places are suggestions. Distances are approximate straight-line metres and can be edited.</Typography>
          <Grid container spacing={1.5} sx={{mt:1}}>
            {amenities.map((a,i)=><React.Fragment key={a.category}>
              <Grid item xs={7} sm={8}><TextField fullWidth size="small" label={a.label} value={a.name} onChange={e=>setAmenities(prev=>prev.map((x,j)=>j===i?{...x,name:e.target.value,source:"partner"}:x))} sx={fieldSx}/></Grid>
              <Grid item xs={5} sm={4}><TextField fullWidth size="small" label="Distance (m)" type="number" value={a.distance} onChange={e=>setAmenities(prev=>prev.map((x,j)=>j===i?{...x,distance:e.target.value,source:"partner"}:x))} sx={fieldSx}/></Grid>
            </React.Fragment>)}
          </Grid>
        </CardContent></Card>
        <Card variant="outlined" sx={{borderRadius:3}}><CardContent sx={{p:{xs:2,md:3}}}>
          <Typography variant="h6" fontWeight={750} mb={2}>3. Property details</Typography>
          <Grid container spacing={2}>
            {[["bedrooms","Bedrooms / BHK"],["bathrooms","Bathrooms"],["area","Area (sq ft)"],["floor","Floor number"],["totalFloors","Total floors"]].map(([key,label])=><Grid size={{ xs: 6, sm: key==="area" ? 12 : 6 }} key={key}><TextField fullWidth label={label} type="number" inputProps={{min:0}} value={form[key]} onChange={change(key)} sx={fieldSx}/></Grid>)}
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth select label="Furnishing" value={form.furnishing} onChange={change("furnishing")} sx={fieldSx}>{["unfurnished","semi-furnished","furnished"].map(v=><MenuItem key={v} value={v}>{v.replace("-"," ")}</MenuItem>)}</TextField></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth select label="Position" value={form.cornerPosition} onChange={change("cornerPosition")} sx={fieldSx}>{[["corner","Corner"],["middle","Middle"],["not_sure","Not sure"]].map(([v,l])=><MenuItem key={v} value={v}>{l}</MenuItem>)}</TextField></Grid>
            {purpose==="rental"&&<Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth select label="Pet policy" value={form.petPolicy} onChange={change("petPolicy")} sx={fieldSx}>{[["allowed","Pets allowed"],["not-allowed","Pets not allowed"],["not_sure","Not sure"]].map(([v,l])=><MenuItem key={v} value={v}>{l}</MenuItem>)}</TextField></Grid>}
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Parking (optional)" value={form.parking} onChange={change("parking")} sx={fieldSx}/></Grid>
          </Grid>
        </CardContent></Card>
        <Card variant="outlined" sx={{borderRadius:3}}><CardContent sx={{p:{xs:2,md:3}}}>
          <Stack direction="row" alignItems="center" spacing={1} mb={1}><ImagePlus size={22}/><Typography variant="h6" fontWeight={750}>4. Property photos</Typography></Stack>
          <Typography color="text.secondary" variant="body2" mb={2}>Add up to 18 photos. At least one Front / Exterior photo is required.</Typography>
          <Button component="label" variant="outlined" sx={{textTransform:"none",mb:2}}>Choose photos<input hidden multiple type="file" accept="image/*" onChange={addPhotos}/></Button>
          <Stack spacing={1.5}>{photos.map((p,i)=><Box key={p.id} sx={{display:"flex",gap:1,alignItems:"center",flexWrap:"wrap",p:1.2,bgcolor:"#f8fafc",borderRadius:2}}>
            <Box component="img" src={URL.createObjectURL(p.file)} alt={p.file.name} sx={{width:56,height:56,objectFit:"cover",borderRadius:1}}/>
            <Box sx={{flex:1,minWidth:100}}><Typography variant="body2" noWrap>{p.file.name}</Typography><Typography variant="caption" color="text.secondary">{(p.file.size/1024/1024).toFixed(1)} MB</Typography></Box>
            <TextField select size="small" label="Photo category" value={p.category} onChange={e=>updatePhoto(p.id,"category",e.target.value)} sx={{minWidth:150}}>{[["front","Front / Exterior"],["living","Living room"],["bedroom","Bedroom"],["kitchen","Kitchen"],["bathroom","Bathroom"],["other","Other"]].map(([v,l])=><MenuItem key={v} value={v}>{l}</MenuItem>)}</TextField>
            <Button color="error" onClick={()=>removePhoto(p.id)}>Remove</Button>
          </Box>)}</Stack>
          <Divider sx={{my:2}}/><Typography variant="body2" color="text.secondary">{photos.length} / 18 photos selected</Typography>
        </CardContent></Card>
        <Button type="submit" variant="contained" size="large" disabled={busy} startIcon={<Send size={18}/>} sx={{py:1.5,borderRadius:2,textTransform:"none",fontWeight:800,background:"#0f766e", "&:hover":{background:"#115e59"}}}>{busy?"Publishing…":"Publish property"}</Button>
      </Stack>
    </Box>
  </Container>;
}
