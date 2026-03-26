import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Box,
  Typography,
  IconButton,
  Checkbox,
  Avatar,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import apiRequest from "../../../utils/api";
import { CALENDAR_COLOR_SWATCHES } from "./calendarUtils";

export default function AddTodoModal({ open, onClose, onCreated, contacts }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState([]);
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("09:00");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("10:00");
  const [colorKey, setColorKey] = useState("blue");
  const [participantIds, setParticipantIds] = useState(() => new Set());
  const [eventScope, setEventScope] = useState("personal");
  const [groupVisibility, setGroupVisibility] = useState("public");
  const [maxAttendees, setMaxAttendees] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const t = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const d = `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
    setEventDate(d);
    setEndDate(d);
    setEventTime("09:00");
    setEndTime("10:00");
    setEventScope("personal");
    setGroupVisibility("public");
    setMaxAttendees("");
    setParticipantIds(new Set());
    setError("");
  }, [open]);

  useEffect(() => {
    if (!eventDate) return;
    setEndDate((prev) => (!prev || prev < eventDate ? eventDate : prev));
  }, [eventDate]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const res = await apiRequest("/api/categories");
        const data = await res.json();
        if (res.ok && Array.isArray(data) && data.length) {
          setCategories(data);
          const first = data[0]?.tag_name || "";
          setCategory((c) => c || first);
        }
      } catch (e) {
        console.error(e);
      }
    })();
  }, [open]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setColorKey("blue");
    setEventScope("personal");
    setGroupVisibility("public");
    setMaxAttendees("");
    setParticipantIds(new Set());
  };

  const toggleParticipant = (id) => {
    setParticipantIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async () => {
    setError("");
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!eventDate || !eventTime) {
      setError("Date and time are required.");
      return;
    }
    if (!category) {
      setError("Choose a category.");
      return;
    }
    if (!endDate || !endTime) {
      setError("End date and end time are required.");
      return;
    }
    const st = new Date(`${eventDate}T${(eventTime.length === 5 ? eventTime : eventTime.slice(0, 5)).replace(/Z$/, "")}:00`);
    const en = new Date(`${endDate}T${(endTime.length === 5 ? endTime : endTime.slice(0, 5)).replace(/Z$/, "")}:00`);
    if (Number.isNaN(st.getTime()) || Number.isNaN(en.getTime())) {
      setError("Invalid start or end.");
      return;
    }
    if (en <= st) {
      setError("End must be after start.");
      return;
    }
    if (eventScope === "group" && groupVisibility === "public") {
      const n = parseInt(String(maxAttendees).trim(), 10);
      if (!Number.isFinite(n) || n < 1 || n > 99999) {
        setError("Enter a maximum number of attendees (1–99999) for public group events.");
        return;
      }
    }
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        category,
        event_date: eventDate,
        event_time: eventTime.length === 5 ? eventTime : eventTime.slice(0, 5),
        end_date: endDate,
        end_time: endTime.length === 5 ? endTime : endTime.slice(0, 5),
        participant_user_ids: eventScope === "group" ? [...participantIds] : [],
        calendar_color: colorKey,
        scope: eventScope,
        visibility: eventScope === "group" ? groupVisibility : "private",
      };
      if (eventScope === "group" && groupVisibility === "public") {
        payload.max_attendees = parseInt(String(maxAttendees).trim(), 10);
      }
      const res = await apiRequest("/api/calendar/todos", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to create event.");
        return;
      }
      resetForm();
      onCreated?.();
      onClose?.();
    } catch (e) {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth scroll="body">
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pr: 1 }}>
        Add New Event
        <IconButton aria-label="close" onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {error ? (
          <Typography color="error" variant="body2" sx={{ mb: 2 }}>
            {error}
          </Typography>
        ) : null}
        <TextField
          label="Title"
          placeholder="e.g., Math Assignment"
          fullWidth
          margin="normal"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <TextField
          label="Description"
          placeholder="Add details about this task..."
          fullWidth
          margin="normal"
          multiline
          minRows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <TextField
          select
          label="Category"
          fullWidth
          margin="normal"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {categories.map((item) => (
            <MenuItem key={item.tag_name} value={item.tag_name}>
              {item.tag_name}
            </MenuItem>
          ))}
        </TextField>
        <Typography variant="subtitle2" sx={{ mt: 2, mb: 0.5 }}>
          Start
        </Typography>
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          <TextField
            label="Date"
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ flex: "1 1 160px" }}
          />
          <TextField
            label="Time"
            type="time"
            value={eventTime}
            onChange={(e) => setEventTime(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ flex: "1 1 140px" }}
          />
        </Box>
        <Typography variant="subtitle2" sx={{ mt: 2, mb: 0.5 }}>
          End
        </Typography>
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          <TextField
            label="End date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            inputProps={{ min: eventDate || undefined }}
            InputLabelProps={{ shrink: true }}
            sx={{ flex: "1 1 160px" }}
          />
          <TextField
            label="End time"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ flex: "1 1 140px" }}
          />
        </Box>
        <Typography variant="subtitle2" sx={{ mt: 2, mb: 0.5 }}>
          Event type
        </Typography>
        <ToggleButtonGroup
          exclusive
          fullWidth
          size="small"
          value={eventScope}
          onChange={(_, v) => {
            if (!v) return;
            setEventScope(v);
            if (v === "personal") setParticipantIds(new Set());
          }}
          sx={{ mb: 1 }}
        >
          <ToggleButton value="personal" sx={{ textTransform: "none", fontWeight: 600 }}>
            Personal
          </ToggleButton>
          <ToggleButton value="group" sx={{ textTransform: "none", fontWeight: 600 }}>
            Group
          </ToggleButton>
        </ToggleButtonGroup>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
          {eventScope === "personal"
            ? "Only you—attendees are not shown or stored."
            : "Invite people from the directory below."}
        </Typography>
        {eventScope === "group" ? (
          <>
            <Typography variant="subtitle2" sx={{ mt: 1, mb: 0.5 }}>
              Group visibility
            </Typography>
            <ToggleButtonGroup
              exclusive
              fullWidth
              size="small"
              value={groupVisibility}
              onChange={(_, v) => v && setGroupVisibility(v)}
              sx={{ mb: 1 }}
            >
              <ToggleButton value="public" sx={{ textTransform: "none", fontWeight: 600 }}>
                Public
              </ToggleButton>
              <ToggleButton value="private" sx={{ textTransform: "none", fontWeight: 600 }}>
                Private
              </ToggleButton>
            </ToggleButtonGroup>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
              Public appears for everyone; private appears only for selected attendees.
            </Typography>
            {groupVisibility === "public" ? (
              <TextField
                label="Maximum attendees"
                type="number"
                fullWidth
                margin="normal"
                value={maxAttendees}
                onChange={(e) => setMaxAttendees(e.target.value)}
                inputProps={{ min: 1, max: 99999 }}
                helperText="How many people can join this public event (including people who discover it outside your invite list)."
              />
            ) : null}
          </>
        ) : null}
        <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
          Color
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          {CALENDAR_COLOR_SWATCHES.map((c) => (
            <Box
              key={c.key}
              onClick={() => setColorKey(c.key)}
              sx={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                bgcolor: c.hex,
                cursor: "pointer",
                boxShadow: colorKey === c.key ? "0 0 0 3px #1a202c" : "none",
                border: "2px solid #fff",
              }}
            />
          ))}
        </Box>
        {eventScope === "group" ? (
          <>
            <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
              Attendees
            </Typography>
            <List dense disablePadding sx={{ maxHeight: 220, overflow: "auto", border: "1px solid #E2E8F0", borderRadius: 1 }}>
              {(contacts || []).map((u) => (
                <ListItem key={u.user_id} disablePadding>
                  <ListItemButton onClick={() => toggleParticipant(u.user_id)} dense>
                    <ListItemIcon sx={{ minWidth: 42 }}>
                      <Checkbox edge="start" checked={participantIds.has(u.user_id)} tabIndex={-1} disableRipple />
                    </ListItemIcon>
                    <Avatar sx={{ width: 32, height: 32, mr: 1, fontSize: "0.85rem" }}>
                      {(u.display_name || u.email || "?").charAt(0).toUpperCase()}
                    </Avatar>
                    <ListItemText primary={u.display_name || u.email} secondary={u.email} />
                  </ListItemButton>
                </ListItem>
              ))}
              {(!contacts || contacts.length === 0) && (
                <ListItem>
                  <ListItemText primary="No other users in the directory yet." />
                </ListItem>
              )}
            </List>
          </>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="outlined" color="inherit">
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={saving} sx={{ bgcolor: "#1a202c" }}>
          {saving ? "Saving…" : "Add Event"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
