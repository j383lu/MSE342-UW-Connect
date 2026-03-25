import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Typography,
  Checkbox,
  FormControlLabel,
  IconButton,
  Collapse,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
} from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import EventIcon from "@mui/icons-material/Event";
import ScheduleIcon from "@mui/icons-material/Schedule";
import apiRequest from "../../../utils/api";
import { useUser } from "../../../contexts/UserContext";
import AddTodoModal from "./AddTodoModal";
import {
  eventDateRange,
  extractCalendarColor,
  extractCalendarScope,
  extractCalendarVisibility,
  colorHexForKey,
  contactHue,
  sameDay,
  startOfWeekMonday,
  addDays,
  formatDayHeader,
  formatShortDayTime,
  formatShortEndTime,
  eventOverlapsCalendarDay,
  visibleSegmentOnDay,
  layoutOverlapsWithSegments,
  endOfCalendarDayExclusive,
} from "./calendarUtils";

const LS_CONTACTS = "uwconnect_calendar_contact_ids";
const LS_CATS = "uwconnect_calendar_category_filters";

/** Map GET /api/events/:id/attendees rows to user ids for checkbox state. */
function attendeeRowsToParticipantIds(data, contactsList) {
  if (!Array.isArray(data)) return [];
  return data
    .map((a) => {
      const directId = Number(a.user_id);
      if (Number.isInteger(directId) && directId > 0) return directId;
      const rawEmail = String(a.attendee_email || a.attendee_name || "").trim().toLowerCase();
      if (!rawEmail || !rawEmail.includes("@")) return null;
      const contact = (contactsList || []).find(
        (c) => String(c.email || "").trim().toLowerCase() === rawEmail
      );
      const contactId = Number(contact?.user_id);
      return Number.isInteger(contactId) && contactId > 0 ? contactId : null;
    })
    .filter((id) => Number.isInteger(id) && id > 0);
}

function getCalendarScope(ev) {
  const explicit = String(ev?.calendar_scope || "").trim().toLowerCase();
  if (explicit === "personal" || explicit === "group") return explicit;
  const fromTags = extractCalendarScope(ev?.tags);
  if (fromTags) return fromTags;
  // Events created via /api/events use event_type 'group' but often have no __calscope__ tag;
  // calendar list does not include attendee_count, so do not rely on that heuristic alone.
  const eventType = String(ev?.event_type || "").trim().toLowerCase();
  if (eventType === "group" || eventType === "private") return "group";
  const attendeeCount = Number(ev?.attendee_count || 0);
  return attendeeCount > 0 ? "group" : "personal";
}

function getCalendarVisibility(ev) {
  const etDb = String(ev?.event_type || "").trim().toLowerCase();
  if (etDb === "private") return "private";
  const explicit = String(ev?.calendar_visibility || "").trim().toLowerCase();
  if (explicit === "public" || explicit === "private") return explicit;
  const fromTags = extractCalendarVisibility(ev?.tags);
  if (fromTags) return fromTags;
  return getCalendarScope(ev) === "group" ? "public" : "private";
}

function getCalendarEventTypeText(ev) {
  const raw = String(ev?.event_type || "").trim();
  if (!raw) return "—";
  const t = raw.toLowerCase();
  if (t === "group") return "Group";
  if (t === "public") return "Public";
  if (t === "private") return "Private";
  return raw;
}

/** True when this row came from the calendar quick-add flow (tags include __calendar__). */
function eventHasCalendarTag(ev) {
  if (!ev?.tags || typeof ev.tags !== "string") return false;
  return ev.tags.split(",").some((p) => String(p).trim() === "__calendar__");
}

/**
 * Primary type chip: matches Event Details "Type" for feed events (public/group).
 * Calendar items use Personal/Group from __calscope__ even though todos store event_type "public" in DB.
 */
function getCalendarTypeBadge(ev) {
  if (eventHasCalendarTag(ev)) {
    const scope = getCalendarScope(ev);
    if (scope === "group") return { label: "Group", kind: "group" };
    return { label: "Personal", kind: "personal" };
  }
  const et = String(ev?.event_type || "").trim().toLowerCase();
  if (et === "group") return { label: "Group", kind: "group" };
  if (et === "private") return { label: "Private", kind: "private" };
  if (et === "public") return { label: "Public", kind: "public" };
  const scope = getCalendarScope(ev);
  if (scope === "group") return { label: "Group", kind: "group" };
  return { label: "Personal", kind: "personal" };
}

/** Edit dialog scope: calendar rows use __calscope__; feed events (public/group) use group UI. */
function getEditFormScope(ev) {
  if (eventHasCalendarTag(ev)) {
    return getCalendarScope(ev);
  }
  const et = String(ev?.event_type || "").trim().toLowerCase();
  if (et === "group" || et === "public" || et === "private") {
    return "group";
  }
  return getCalendarScope(ev);
}

/** Visibility for group section of edit form (matches listing semantics for feed events). */
function getEditFormVisibility(ev) {
  if (eventHasCalendarTag(ev)) {
    return getCalendarVisibility(ev);
  }
  const et = String(ev?.event_type || "").trim().toLowerCase();
  if (et === "private") {
    return "private";
  }
  if (et === "public" || et === "group") {
    return "public";
  }
  return getCalendarVisibility(ev);
}

/**
 * One chip for group audience (Public/Private) instead of stacking "Group" + "Private" or "Private" twice.
 */
/** Hide RSVP capacity on invite-only / private listings (not shown to the public feed). */
function isPrivateListing(ev) {
  const et = String(ev?.event_type || "").trim().toLowerCase();
  if (et === "private") return true;
  return getCalendarVisibility(ev) === "private";
}

/** Matches the "Personal" chip only — not Public/Group feed rows misclassified by scope heuristics. */
function showsPersonalTypeBadge(ev) {
  return getCalendarTypeBadge(ev).kind === "personal";
}

/** Personal (badge) items only: overdue after end date/time (deadline). */
function isPersonalCalendarOverdue(ev, now = new Date()) {
  if (!showsPersonalTypeBadge(ev)) return false;
  const { end } = eventDateRange(ev);
  return now.getTime() > end.getTime();
}

/** Personal (badge): now is on or after start and before end. */
function isPersonalCalendarInProgress(ev, now = new Date()) {
  if (!showsPersonalTypeBadge(ev)) return false;
  const { start, end } = eventDateRange(ev);
  const t = now.getTime();
  return t >= start.getTime() && t < end.getTime();
}

function getFoldedListingChips(ev) {
  const calScope = getCalendarScope(ev);
  const visibility = getCalendarVisibility(ev);
  const typeBadge = getCalendarTypeBadge(ev);
  const audienceLabel =
    calScope === "group" ? (visibility === "private" ? "Private" : "Public") : null;
  const foldAudience =
    Boolean(audienceLabel) &&
    (typeBadge.label === "Group" || typeBadge.label === audienceLabel);
  const displayLabel = foldAudience ? audienceLabel : typeBadge.label;
  const displayKind = foldAudience
    ? visibility === "private"
      ? "private"
      : "public"
    : typeBadge.kind;
  const showAudienceChip = Boolean(audienceLabel) && !foldAudience;
  return { displayLabel, displayKind, showAudienceChip, audienceLabel, visibility };
}

const HOUR_HEIGHT = 48;
const DAY_START_HOUR = 0;
const DAY_END_HOUR = 24;

function loadIdSet(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr.filter((n) => Number.isInteger(n)) : []);
  } catch {
    return new Set();
  }
}

function saveIdSet(key, set) {
  localStorage.setItem(key, JSON.stringify([...set]));
}

export default function CalendarPage() {
  const { dbUser } = useUser();
  const myId = dbUser?.userId;

  const [view, setView] = useState("day");
  const [cursor, setCursor] = useState(() => new Date());
  const [events, setEvents] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [visibleContactIds, setVisibleContactIds] = useState(() => loadIdSet(LS_CONTACTS));
  const [categoryOn, setCategoryOn] = useState({});
  const [overdueOpen, setOverdueOpen] = useState(true);
  const [upcomingOpen, setUpcomingOpen] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [contactsOpen, setContactsOpen] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [detailsSaving, setDetailsSaving] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailAttendees, setDetailAttendees] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [editingEvent, setEditingEvent] = useState(false);
  const [checkedForRemove, setCheckedForRemove] = useState(() => new Set());
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
  const [removeError, setRemoveError] = useState("");
  const [removing, setRemoving] = useState(false);
  const [editEventForm, setEditEventForm] = useState({
    title: "",
    description: "",
    category: "",
    event_date: "",
    event_time: "09:00",
    end_date: "",
    end_time: "10:00",
    scope: "personal",
    visibility: "public",
    max_attendees: "",
    calendar_color: "blue",
    participant_user_ids: [],
  });

  const fetchContacts = useCallback(async () => {
    const res = await apiRequest("/api/calendar/contacts");
    const data = await res.json().catch(() => []);
    const list = res.ok && Array.isArray(data) ? data : [];
    setContacts(list);
    return list;
  }, []);

  const fetchEvents = useCallback(async () => {
    if (!myId) {
      setEvents([]);
      return [];
    }
    setLoading(true);
    const ids = [myId, ...visibleContactIds];
    const q = ids.join(",");
    let result = [];
    try {
      const res = await apiRequest(`/api/calendar/events?userIds=${encodeURIComponent(q)}`);
      const data = await res.json().catch(() => []);
      if (res.ok) {
        result = Array.isArray(data) ? data : [];
        setEvents(result);
      } else {
        setEvents([]);
      }
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
    return result;
  }, [myId, visibleContactIds]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    saveIdSet(LS_CONTACTS, visibleContactIds);
  }, [visibleContactIds]);

  const allCategories = useMemo(() => {
    const fromEvents = new Set(events.map((e) => e.category).filter(Boolean));
    return [...fromEvents].sort();
  }, [events]);

  useEffect(() => {
    let initial = {};
    try {
      const raw = localStorage.getItem(LS_CATS);
      if (raw) initial = JSON.parse(raw) || {};
    } catch {
      initial = {};
    }
    allCategories.forEach((c) => {
      if (initial[c] === undefined) initial[c] = true;
    });
    setCategoryOn(initial);
  }, [allCategories]);

  useEffect(() => {
    if (Object.keys(categoryOn).length) {
      localStorage.setItem(LS_CATS, JSON.stringify(categoryOn));
    }
  }, [categoryOn]);

  const filteredEvents = useMemo(
    () => events.filter((e) => categoryOn[e.category] !== false),
    [events, categoryOn]
  );

  const overdueList = useMemo(() => {
    const n = new Date();
    return filteredEvents
      .filter((ev) => isPersonalCalendarOverdue(ev, n))
      .sort((a, b) => eventDateRange(a).end - eventDateRange(b).end);
  }, [filteredEvents]);

  const upcomingList = useMemo(() => {
    const n = new Date();
    return filteredEvents
      .filter((ev) => {
        const { end } = eventDateRange(ev);
        return end.getTime() >= n.getTime();
      })
      .sort((a, b) => eventDateRange(a).start - eventDateRange(b).start);
  }, [filteredEvents]);

  const eventsForDay = useCallback(
    (day) => filteredEvents.filter((ev) => eventOverlapsCalendarDay(ev, day)),
    [filteredEvents]
  );

  const goToday = () => setCursor(new Date());
  const shiftDay = (delta) => {
    const n = new Date(cursor);
    n.setDate(n.getDate() + delta);
    setCursor(n);
  };
  const shiftWeek = (delta) => {
    const n = new Date(cursor);
    n.setDate(n.getDate() + delta * 7);
    setCursor(n);
  };
  const shiftMonth = (delta) => {
    const n = new Date(cursor);
    n.setMonth(n.getMonth() + delta);
    setCursor(n);
  };

  const navigate = (dir) => {
    if (view === "day") shiftDay(dir);
    else if (view === "week") shiftWeek(dir);
    else shiftMonth(dir);
  };

  const toggleContact = (id) => {
    setVisibleContactIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addContactByEmail = () => {
    const q = emailInput.trim().toLowerCase();
    if (!q) return;
    const found = contacts.find((c) => String(c.email).toLowerCase() === q);
    if (found) {
      setVisibleContactIds((prev) => new Set(prev).add(found.user_id));
      setEmailInput("");
    }
  };

  const toggleCategory = (cat) => {
    setCategoryOn((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const syncEditFormFromEvent = (ev, participantIds = []) => {
    const cap =
      ev.capacity !== undefined && ev.capacity !== null && ev.capacity !== ""
        ? Number(ev.capacity)
        : 999;
    const editScope = getEditFormScope(ev);
    setEditEventForm({
      title: ev.title || "",
      description: ev.description || "",
      category: ev.category || "",
      event_date: ev.event_date || "",
      event_time: String(ev.event_time || "09:00").slice(0, 5),
      end_date: ev.end_date || ev.event_date || "",
      end_time: String(ev.end_time || "10:00").slice(0, 5),
      scope: editScope,
      visibility: editScope === "group" ? getEditFormVisibility(ev) : "private",
      max_attendees: Number.isFinite(cap) ? String(cap) : "999",
      calendar_color: extractCalendarColor(ev.tags) || "blue",
      participant_user_ids: participantIds,
    });
  };

  const openEventDetails = async (ev) => {
    setSelectedEvent(ev);
    setDetailsOpen(true);
    setEditingEvent(false);
    setDetailsError("");

    try {
      setDetailsLoading(true);
      const res = await apiRequest(`/api/events/${ev.id}/attendees`);
      const data = await res.json().catch(() => []);
      const rows = res.ok && Array.isArray(data) ? data : [];
      setDetailAttendees(rows);
      const participantIds = attendeeRowsToParticipantIds(rows, contacts);

      // Sync checkboxes right away so the edit form is not laggy.
      syncEditFormFromEvent(ev, participantIds);

      // Fetch the full event row for details popup fields (capacity/event_type).
      // This avoids relying on /api/calendar/events list shape / filters.
      try {
        const evRes = await apiRequest(`/api/calendar/events/${ev.id}`);
        const evData = await evRes.json().catch(() => null);
        if (evRes.ok && evData && typeof evData === "object") {
          setSelectedEvent(evData);
          // Keep checkbox state synced to the latest event row.
          syncEditFormFromEvent(evData, participantIds);
        } else {
          // If details fetch fails, fall back to the clicked event object.
          // (Optional: attempt a list refresh for other fields.)
          const list = await fetchEvents();
          const refreshed = Array.isArray(list) ? list.find((e) => Number(e.id) === Number(ev.id)) : null;
          if (refreshed) {
            setSelectedEvent(refreshed);
            syncEditFormFromEvent(refreshed, participantIds);
          }
        }
      } catch {
        // If details fetch fails, fall back to the clicked event object.
      }
    } catch {
      setDetailAttendees([]);
      syncEditFormFromEvent(ev, []);
    } finally {
      setDetailsLoading(false);
    }
  };

  const beginEditingEvent = async () => {
    const ev = selectedEvent;
    if (!ev) return;
    setDetailsError("");
    try {
      const contactList = await fetchContacts();
      const res = await apiRequest(`/api/events/${ev.id}/attendees`);
      const data = await res.json().catch(() => []);
      const rows = res.ok && Array.isArray(data) ? data : [];
      setDetailAttendees(rows);
      const participantIds = attendeeRowsToParticipantIds(rows, contactList);
      syncEditFormFromEvent(ev, participantIds);
    } catch {
      syncEditFormFromEvent(ev, []);
    }
    setEditingEvent(true);
  };

  const closeDetails = () => {
    setDetailsOpen(false);
    setEditingEvent(false);
    setDetailsError("");
    setDetailsSaving(false);
    setDetailAttendees([]);
    setSelectedEvent(null);
  };

  const toggleRemoveCheck = (eventId, checked) => {
    setCheckedForRemove((prev) => {
      const next = new Set(prev);
      if (checked) next.add(Number(eventId));
      else next.delete(Number(eventId));
      return next;
    });
    if (checked) {
      setRemoveError("");
      setRemoveConfirmOpen(true);
    }
  };

  const handleCancelRemove = () => {
    setRemoveConfirmOpen(false);
    setRemoveError("");
    setCheckedForRemove(new Set());
  };

  const handleConfirmRemove = async () => {
    const ids = [...checkedForRemove];
    if (!ids.length) {
      setRemoveConfirmOpen(false);
      return;
    }
    setRemoving(true);
    setRemoveError("");
    try {
      for (const id of ids) {
        const res = await apiRequest(`/api/calendar/events/${id}`, { method: "DELETE" });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to remove event.");
        }
      }
      setRemoveConfirmOpen(false);
      setCheckedForRemove(new Set());
      await fetchEvents();
    } catch (e) {
      setRemoveError(e.message || "Failed to remove selected event(s).");
    } finally {
      setRemoving(false);
    }
  };

  const handleSaveEditedEvent = async () => {
    if (!selectedEvent) return;
    setDetailsError("");

    if (!editEventForm.title.trim()) {
      setDetailsError("Title is required.");
      return;
    }
    if (!editEventForm.category.trim()) {
      setDetailsError("Category is required.");
      return;
    }
    const st = new Date(`${editEventForm.event_date}T${editEventForm.event_time}:00`);
    const en = new Date(`${editEventForm.end_date}T${editEventForm.end_time}:00`);
    if (Number.isNaN(st.getTime()) || Number.isNaN(en.getTime()) || en <= st) {
      setDetailsError("End must be after start.");
      return;
    }
    const isPublicGroup =
      editEventForm.scope === "group" && (editEventForm.visibility || "public") === "public";
    if (isPublicGroup) {
      const n = parseInt(String(editEventForm.max_attendees).trim(), 10);
      if (!Number.isFinite(n) || n < 1 || n > 99999) {
        setDetailsError("Enter a maximum number of attendees (1–99999) for public group events.");
        return;
      }
    }

    try {
      setDetailsSaving(true);
      const body = {
        title: editEventForm.title.trim(),
        description: editEventForm.description.trim(),
        category: editEventForm.category.trim(),
        event_date: editEventForm.event_date,
        event_time: editEventForm.event_time,
        end_date: editEventForm.end_date,
        end_time: editEventForm.end_time,
        scope: editEventForm.scope,
        visibility: editEventForm.scope === "group" ? editEventForm.visibility : "private",
        calendar_color: editEventForm.calendar_color,
        participant_user_ids:
          editEventForm.scope === "group"
            ? editEventForm.participant_user_ids
                .map((id) => Number(id))
                .filter((id) => Number.isInteger(id) && id > 0)
            : [],
      };
      const capCandidate = parseInt(String(editEventForm.max_attendees).trim(), 10);
      if (Number.isFinite(capCandidate) && capCandidate >= 1 && capCandidate <= 99999) {
        body.capacity = capCandidate;
      }
      if (isPublicGroup) {
        body.max_attendees = capCandidate;
      }
      const res = await apiRequest(`/api/calendar/events/${selectedEvent.id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDetailsError(data.error || "Failed to update event.");
        return;
      }

      const eventId = Number(selectedEvent.id);
      const optimisticCapacity =
        data.capacity !== undefined && data.capacity !== null
          ? data.capacity
          : editEventForm.max_attendees || selectedEvent.capacity;
      const optimisticAttendees = (editEventForm.participant_user_ids || []).map((uidRaw) => {
        const uid = Number(uidRaw);
        const contact = contacts.find((c) => Number(c.user_id) === uid);
        return {
          user_id: uid,
          attendee_email: contact?.email || "",
          attendee_name: contact?.display_name || contact?.email || `User ${uid}`,
        };
      });
      setDetailAttendees(optimisticAttendees);
      setSelectedEvent((prev) =>
        prev
          ? {
              ...prev,
              title: editEventForm.title.trim(),
              description: editEventForm.description.trim(),
              category: editEventForm.category.trim(),
              event_date: editEventForm.event_date,
              event_time: editEventForm.event_time,
              end_date: editEventForm.end_date,
              end_time: editEventForm.end_time,
              event_type:
                data.event_type !== undefined && data.event_type !== null && data.event_type !== ""
                  ? data.event_type
                  : prev.event_type ?? selectedEvent.event_type,
              capacity:
                optimisticCapacity !== undefined &&
                optimisticCapacity !== null &&
                optimisticCapacity !== ""
                  ? optimisticCapacity
                  : prev.capacity,
            }
          : prev
      );

      // Best-effort refresh from server; don't fail the save flow if this request fails.
      try {
        const list = await fetchEvents();
        const updated = list.find((e) => Number(e.id) === eventId);
        if (updated) setSelectedEvent(updated);
      } catch {
        // Keep optimistic local state
      }

      setEditingEvent(false);
    } catch {
      setDetailsError("Failed to update event.");
    } finally {
      setDetailsSaving(false);
    }
  };

  const monthGrid = useMemo(() => {
    const y = cursor.getFullYear();
    const m = cursor.getMonth();
    const first = new Date(y, m, 1);
    const start = new Date(first);
    const dow = first.getDay();
    const pad = dow === 0 ? 6 : dow - 1;
    start.setDate(first.getDate() - pad);
    const days = [];
    for (let i = 0; i < 42; i++) {
      days.push(addDays(start, i));
    }
    return days;
  }, [cursor]);

  const renderTodoCard = (ev, { dense } = {}) => {
    const { start, end } = eventDateRange(ev);
    const colorKey = extractCalendarColor(ev.tags);
    const hex = colorHexForKey(colorKey);
    const personalOverdue = isPersonalCalendarOverdue(ev);
    const personalInProgress = isPersonalCalendarInProgress(ev);
    const mine = Number(ev.created_by) === Number(myId);
    const creatorLabel = mine ? "You" : ev.creator_name || "Peer";
    const { displayLabel, displayKind, showAudienceChip, audienceLabel, visibility } =
      getFoldedListingChips(ev);
    const capNum =
      ev.capacity !== undefined && ev.capacity !== null && ev.capacity !== ""
        ? Number(ev.capacity)
        : NaN;
    const capacityLabel =
      !isPrivateListing(ev) && Number.isFinite(capNum) && capNum > 0 ? `${capNum} spots` : null;
    const hideCreatorRow = false;
    const isPeerOwned = visibleContactIds.has(Number(ev.created_by));

    return (
      <Paper
        key={ev.id}
        elevation={0}
        onClick={() => openEventDetails(ev)}
        sx={{
          p: 1.25,
          mb: 1,
          border: "1px solid #E2E8F0",
          borderRadius: 2,
          bgcolor: isPeerOwned ? "#E5E7EB" : "#fff",
          cursor: "pointer",
        }}
      >
        <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
          <Checkbox
            size="small"
            checked={checkedForRemove.has(Number(ev.id))}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => toggleRemoveCheck(ev.id, e.target.checked)}
            sx={{ p: 0, mt: -0.5 }}
          />
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              bgcolor: isPeerOwned ? "#9CA3AF" : hex,
              mt: 0.6,
              flexShrink: 0,
            }}
          />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {personalOverdue ? (
              <Typography variant="caption" sx={{ color: "#718096", fontWeight: 700, display: "block" }}>
                Overdue
              </Typography>
            ) : personalInProgress ? (
              <Typography variant="caption" sx={{ color: "#4A5568", fontWeight: 700, display: "block" }}>
                In progress
              </Typography>
            ) : null}
            <Typography variant="subtitle2" fontWeight={700} sx={{ lineHeight: 1.3 }}>
              {ev.title}
            </Typography>
            {!dense && ev.description ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: "0.8rem" }}>
                {ev.description.length > 120 ? `${ev.description.slice(0, 117)}…` : ev.description}
              </Typography>
            ) : null}
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 0.75, alignItems: "center" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "text.secondary", fontSize: "0.75rem" }}>
                <EventIcon sx={{ fontSize: 16 }} />
                {formatShortDayTime(start)}
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "text.secondary", fontSize: "0.75rem" }}>
                <ScheduleIcon sx={{ fontSize: 16 }} />
                End {formatShortEndTime(ev)}
              </Box>
            </Box>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mt: 0.75, alignItems: "center" }}>
              <Typography
                variant="caption"
                sx={{
                  display: "inline-block",
                  px: 1,
                  py: 0.25,
                  borderRadius: 999,
                  bgcolor: "#F7FAFC",
                  color: "#4A5568",
                }}
              >
                {ev.category}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  display: "inline-block",
                  px: 1,
                  py: 0.25,
                  borderRadius: 999,
                  bgcolor:
                    displayKind === "personal"
                      ? "#EBF8FF"
                      : displayKind === "group"
                        ? "#F0FFF4"
                        : displayKind === "private"
                          ? "#FAF5FF"
                          : "#E6FFFA",
                  color:
                    displayKind === "personal"
                      ? "#2B6CB0"
                      : displayKind === "group"
                        ? "#276749"
                        : displayKind === "private"
                          ? "#553C9A"
                          : "#2C7A7B",
                  fontWeight: 700,
                }}
              >
                {displayLabel}
              </Typography>
              {showAudienceChip ? (
                <Typography
                  variant="caption"
                  sx={{
                    display: "inline-block",
                    px: 1,
                    py: 0.25,
                    borderRadius: 999,
                    bgcolor: visibility === "private" ? "#FAF5FF" : "#FFFAF0",
                    color: visibility === "private" ? "#553C9A" : "#C05621",
                    fontWeight: 700,
                  }}
                >
                  {audienceLabel}
                </Typography>
              ) : null}
              {capacityLabel ? (
                <Typography
                  variant="caption"
                  sx={{
                    display: "inline-block",
                    px: 1,
                    py: 0.25,
                    borderRadius: 999,
                    bgcolor: "#EDF2F7",
                    color: "#2D3748",
                    fontWeight: 600,
                  }}
                >
                  {capacityLabel}
                </Typography>
              ) : null}
            </Box>
            {!hideCreatorRow && !mine ? (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                {creatorLabel}
              </Typography>
            ) : null}
          </Box>
        </Box>
      </Paper>
    );
  };

  const renderDayGrid = () => {
    const day = cursor;
    const list = eventsForDay(day);
    const segments = list
      .map((ev) => {
        const seg = visibleSegmentOnDay(ev, day);
        return seg ? { ev, segStart: seg.segStart, segEnd: seg.segEnd } : null;
      })
      .filter(Boolean);

    const layouts = layoutOverlapsWithSegments(
      segments.map(({ ev, segStart, segEnd }) => ({
        event: ev,
        startMs: segStart.getTime(),
        endMs: segEnd.getTime(),
      }))
    );
    const layoutMap = new Map(layouts.map((L) => [L.event.id, L]));

    const gridDayStart = new Date(day);
    gridDayStart.setHours(DAY_START_HOUR, 0, 0, 0);

    const blocks = segments.map(({ ev, segStart, segEnd }) => {
      const { start: fullStart, end: fullEnd } = eventDateRange(ev);
      const endLabel = formatShortEndTime(ev);
      const minutesFromStart = (segStart - gridDayStart) / 60000;
      const durMin = Math.max(1, (segEnd - segStart) / 60000);
      const top = (minutesFromStart / 60) * HOUR_HEIGHT;
      const height = (durMin / 60) * HOUR_HEIGHT;
      const L = layoutMap.get(ev.id) || { leftPct: 0, widthPct: 100 };
      const colorKey = extractCalendarColor(ev.tags);
      const hex = colorHexForKey(colorKey);
      const { displayLabel: blockPrimary, showAudienceChip: showBlockAudience, audienceLabel: blockAudience } =
        getFoldedListingChips(ev);
      const personalOverdueBlock = isPersonalCalendarOverdue(ev);
      const personalInProgressBlock =
        isPersonalCalendarInProgress(ev) && !personalOverdueBlock;
      const statusBanner = personalOverdueBlock || personalInProgressBlock;
      const scopeShort = blockPrimary;
      const visibilityShort = showBlockAudience ? blockAudience : null;
      const capBlock =
        ev.capacity !== undefined && ev.capacity !== null && ev.capacity !== ""
          ? Number(ev.capacity)
          : NaN;
      const capacityShort =
        !isPrivateListing(ev) && Number.isFinite(capBlock) && capBlock > 0
          ? `${capBlock} spots`
          : null;
      const isPeerOwned = visibleContactIds.has(Number(ev.created_by));
      const continuesNextDay = segEnd < fullEnd;
      const continuedFromPrior = segStart > fullStart;
      const singleCalendarDayEvent = sameDay(fullStart, fullEnd);
      const endsAtDayBoundary =
        continuesNextDay && segEnd.getTime() === endOfCalendarDayExclusive(day).getTime();

      return (
        <Box
          key={`${ev.id}-${segStart.getTime()}`}
          onClick={() => openEventDetails(ev)}
          sx={{
            position: "absolute",
            left: `calc(${L.leftPct}% + 4px)`,
            width: `calc(${L.widthPct}% - 8px)`,
            top: `${top}px`,
            height: `${Math.max(height, 36)}px`,
            borderRadius: 1,
            overflow: "hidden",
            boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
            zIndex: 2,
            cursor: "pointer",
            boxSizing: "border-box",
            border: personalInProgressBlock ? "2px solid #1A202C" : "none",
          }}
        >
          {personalOverdueBlock ? (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                bgcolor: "#CBD5E0",
                color: "#1A202C",
                px: 0.75,
                py: 0.25,
                fontSize: "0.65rem",
                fontWeight: 800,
                letterSpacing: "0.06em",
              }}
            >
              OVERDUE
            </Box>
          ) : personalInProgressBlock ? (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                bgcolor: "#E2E8F0",
                color: "#1A202C",
                px: 0.75,
                py: 0.25,
                fontSize: "0.65rem",
                fontWeight: 800,
                letterSpacing: "0.05em",
              }}
            >
              IN PROGRESS
            </Box>
          ) : null}
          <Box
            sx={{
              px: 1,
              py: 0.75,
              bgcolor: isPeerOwned ? "#D1D5DB" : hex,
              color: isPeerOwned ? "#111827" : "#fff",
              height: statusBanner ? "calc(100% - 24px)" : "100%",
              boxSizing: "border-box",
            }}
          >
            <Typography
              variant="caption"
              fontWeight={800}
              sx={{ color: isPeerOwned ? "#111827" : "#fff", display: "block", lineHeight: 1.2 }}
            >
              {ev.title}
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: isPeerOwned ? "#374151" : "rgba(255,255,255,0.9)", fontSize: "0.65rem" }}
            >
              {singleCalendarDayEvent ? (
                <>
                  {fullStart.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })} → End {endLabel}
                </>
              ) : (
                <>
                  {segStart.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })} –{" "}
                  {endsAtDayBoundary
                    ? "end of day"
                    : segEnd.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                  {" · ends "}
                  {endLabel}
                </>
              )}
            </Typography>
            {!singleCalendarDayEvent && continuesNextDay ? (
              <Typography
                variant="caption"
                sx={{ color: isPeerOwned ? "#4B5563" : "rgba(255,255,255,0.95)", fontSize: "0.58rem", fontWeight: 700 }}
              >
                Continues next day
              </Typography>
            ) : null}
            {!singleCalendarDayEvent && continuedFromPrior ? (
              <Typography
                variant="caption"
                sx={{ color: isPeerOwned ? "#4B5563" : "rgba(255,255,255,0.95)", fontSize: "0.58rem", fontWeight: 700 }}
              >
                Continued from prior day
              </Typography>
            ) : null}
            {scopeShort ? (
              <Typography
                variant="caption"
                sx={{
                  display: "inline-block",
                  mt: 0.35,
                  mr: 0.35,
                  px: 0.6,
                  py: 0.1,
                  borderRadius: 1,
                  bgcolor: isPeerOwned ? "rgba(17,24,39,0.08)" : "rgba(255,255,255,0.25)",
                  fontSize: "0.6rem",
                  fontWeight: 800,
                }}
              >
                {scopeShort}
              </Typography>
            ) : null}
            {visibilityShort ? (
              <Typography
                variant="caption"
                sx={{
                  display: "inline-block",
                  mt: 0.35,
                  mr: 0.35,
                  px: 0.6,
                  py: 0.1,
                  borderRadius: 1,
                  bgcolor: isPeerOwned ? "rgba(17,24,39,0.06)" : "rgba(255,255,255,0.2)",
                  fontSize: "0.58rem",
                  fontWeight: 800,
                }}
              >
                {visibilityShort}
              </Typography>
            ) : null}
            {capacityShort ? (
              <Typography
                variant="caption"
                sx={{
                  display: "inline-block",
                  mt: 0.35,
                  px: 0.6,
                  py: 0.1,
                  borderRadius: 1,
                  bgcolor: isPeerOwned ? "rgba(17,24,39,0.08)" : "rgba(255,255,255,0.22)",
                  fontSize: "0.58rem",
                  fontWeight: 700,
                }}
              >
                {capacityShort}
              </Typography>
            ) : null}
            {ev.description ? (
              <Typography
                variant="caption"
                sx={{ color: isPeerOwned ? "#4B5563" : "rgba(255,255,255,0.85)", fontSize: "0.65rem", display: "block", mt: 0.25 }}
              >
                {ev.description.length > 60 ? `${ev.description.slice(0, 57)}…` : ev.description}
              </Typography>
            ) : null}
          </Box>
        </Box>
      );
    });

    const hours = [];
    for (let h = DAY_START_HOUR; h < DAY_END_HOUR; h++) {
      hours.push(h);
    }

    return (
      <Box sx={{ display: "flex", flex: 1, minHeight: 520, overflow: "auto", border: "1px solid #E2E8F0", borderRadius: 1 }}>
        <Box sx={{ width: 56, flexShrink: 0, pt: 1 }}>
          {hours.map((h) => (
            <Box
              key={h}
              sx={{
                height: HOUR_HEIGHT,
                textAlign: "right",
                pr: 1,
                fontSize: "0.75rem",
                color: "#718096",
                boxSizing: "border-box",
                pt: 0.5,
              }}
            >
              {h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`}
            </Box>
          ))}
        </Box>
        <Box sx={{ flex: 1, position: "relative", borderLeft: "1px solid #E2E8F0" }}>
          {hours.map((h) => (
            <Box
              key={h}
              sx={{
                height: HOUR_HEIGHT,
                borderBottom: "1px solid #EDF2F7",
                boxSizing: "border-box",
              }}
            />
          ))}
          <Box sx={{ position: "absolute", left: 0, right: 0, top: 0, height: hours.length * HOUR_HEIGHT }}>{blocks}</Box>
        </Box>
      </Box>
    );
  };

  const renderWeekStrip = () => {
    const start = startOfWeekMonday(cursor);
    const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
    return (
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
        {days.map((d) => {
          const dayEvts = eventsForDay(d);
          return (
            <Paper key={d.toISOString()} sx={{ flex: "1 1 140px", p: 1.5, minHeight: 160, border: "1px solid #E2E8F0" }}>
              <Typography variant="subtitle2" fontWeight={700}>
                {d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
              </Typography>
              {dayEvts.length === 0 ? (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                  No items
                </Typography>
              ) : (
                dayEvts.map((ev) => {
                  const { start: s } = eventDateRange(ev);
                  const hex = colorHexForKey(extractCalendarColor(ev.tags));
                  const isPeerOwned = visibleContactIds.has(Number(ev.created_by));
                  return (
                    <Box
                      key={ev.id}
                      onClick={() => openEventDetails(ev)}
                      sx={{
                        mt: 1,
                        p: 0.75,
                        borderRadius: 1,
                        bgcolor: isPeerOwned ? "#E5E7EB" : `${hex}22`,
                        borderLeft: `4px solid ${isPeerOwned ? "#9CA3AF" : hex}`,
                        cursor: "pointer",
                      }}
                    >
                      <Typography variant="caption" fontWeight={700} display="block">
                        {ev.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {s.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                      </Typography>
                    </Box>
                  );
                })
              )}
            </Paper>
          );
        })}
      </Box>
    );
  };

  const renderMonthGrid = () => {
    const y = cursor.getFullYear();
    const m = cursor.getMonth();
    return (
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
          {cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0.5 }}>
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((w) => (
            <Typography key={w} variant="caption" fontWeight={700} color="text.secondary" sx={{ textAlign: "center", py: 0.5 }}>
              {w}
            </Typography>
          ))}
          {monthGrid.map((d) => {
            const inMonth = d.getMonth() === m;
            const count = eventsForDay(d).length;
            const isToday = sameDay(d, new Date());
            return (
              <Box
                key={d.toISOString()}
                onClick={() => {
                  setCursor(new Date(d));
                  setView("day");
                }}
                sx={{
                  minHeight: 72,
                  p: 0.5,
                  borderRadius: 1,
                  border: isToday ? "2px solid #3182CE" : "1px solid #EDF2F7",
                  bgcolor: inMonth ? "#fff" : "#F7FAFC",
                  cursor: "pointer",
                }}
              >
                <Typography variant="caption" fontWeight={isToday ? 800 : 600} color={inMonth ? "text.primary" : "text.disabled"}>
                  {d.getDate()}
                </Typography>
                {count > 0 ? (
                  <Typography variant="caption" display="block" sx={{ color: "#3182CE", fontWeight: 700, mt: 0.5 }}>
                    {count} item{count === 1 ? "" : "s"}
                  </Typography>
                ) : null}
              </Box>
            );
          })}
        </Box>
      </Box>
    );
  };

  return (
    <Box sx={{ bgcolor: "#F7FAFC", minHeight: "calc(100vh - 64px)", pb: 4 }}>
      <Box sx={{ maxWidth: 1400, mx: "auto", px: { xs: 1.5, sm: 2, md: 3 }, pt: 2 }}>
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 2,
            mb: 2,
          }}
        >
          <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: "-0.03em" }}>
            Calendar
          </Typography>
          <Button variant="outlined" size="small" onClick={goToday} sx={{ textTransform: "none", borderColor: "#CBD5E0", color: "#2D3748" }}>
            Today
          </Button>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <IconButton size="small" onClick={() => navigate(-1)} aria-label="Previous">
              <ChevronLeftIcon />
            </IconButton>
            <IconButton size="small" onClick={() => navigate(1)} aria-label="Next">
              <ChevronRightIcon />
            </IconButton>
            <Typography variant="body1" sx={{ ml: 1, fontWeight: 600, minWidth: 220 }}>
              {view === "month"
                ? cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })
                : view === "week"
                  ? `Week of ${startOfWeekMonday(cursor).toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}`
                  : formatDayHeader(cursor)}
            </Typography>
          </Box>
          <Box sx={{ flex: 1 }} />
          <ToggleButtonGroup
            size="small"
            value={view}
            exclusive
            onChange={(_, v) => v && setView(v)}
            sx={{ bgcolor: "#fff", "& .MuiToggleButton-root": { textTransform: "none", px: 2 } }}
          >
            <ToggleButton value="day">Day</ToggleButton>
            <ToggleButton value="week">Week</ToggleButton>
            <ToggleButton value="month">Month</ToggleButton>
          </ToggleButtonGroup>
          <Button variant="contained" onClick={() => setAddOpen(true)} sx={{ textTransform: "none", bgcolor: "#3182CE", fontWeight: 700 }}>
            + Add Event
          </Button>
        </Box>

        <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start", flexDirection: { xs: "column", md: "row" } }}>
          <Paper
            elevation={0}
            sx={{
              width: { xs: "100%", md: 300 },
              flexShrink: 0,
              p: 2,
              border: "1px solid #E2E8F0",
              borderRadius: 2,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
              <Typography variant="subtitle2" fontWeight={800}>
                Filters
              </Typography>
              <IconButton size="small" onClick={() => setFiltersOpen(!filtersOpen)}>
                {filtersOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Box>
            <Collapse in={filtersOpen}>
              {allCategories.length === 0 ? (
                <Typography variant="caption" color="text.secondary">
                  Categories appear when you have events.
                </Typography>
              ) : (
                allCategories.map((cat) => (
                  <FormControlLabel
                    key={cat}
                    control={<Checkbox size="small" checked={categoryOn[cat] !== false} onChange={() => toggleCategory(cat)} />}
                    label={cat}
                    sx={{ display: "flex", ml: 0 }}
                  />
                ))
              )}
            </Collapse>

            <Box sx={{ borderTop: "1px solid #EDF2F7", mt: 2, pt: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                <Typography variant="subtitle2" fontWeight={800}>
                  Contacts
                </Typography>
                <IconButton size="small" onClick={() => setContactsOpen(!contactsOpen)}>
                  {contactsOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              </Box>
              <Collapse in={contactsOpen}>
                <Box sx={{ display: "flex", gap: 1, mb: 1.5 }}>
                  <TextField
                    size="small"
                    fullWidth
                    placeholder="Add contact email…"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addContactByEmail()}
                  />
                  <Button variant="contained" size="small" onClick={addContactByEmail} sx={{ textTransform: "none", bgcolor: "#3182CE", flexShrink: 0 }}>
                    Add
                  </Button>
                </Box>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                  Check people to overlay their schedules (from User Credentials).
                </Typography>
                <Box sx={{ maxHeight: 220, overflow: "auto" }}>
                  {contacts.map((c) => {
                    const checked = visibleContactIds.has(c.user_id);
                    const hue = contactHue(c.user_id);
                    return (
                      <FormControlLabel
                        key={c.user_id}
                        control={<Checkbox size="small" checked={checked} onChange={() => toggleContact(c.user_id)} />}
                        label={
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Box
                              sx={{
                                width: 10,
                                height: 10,
                                borderRadius: "50%",
                                bgcolor: `hsl(${hue}, 65%, 50%)`,
                              }}
                            />
                            <span>{c.display_name || c.email}</span>
                          </Box>
                        }
                        sx={{ display: "flex", ml: 0, alignItems: "center" }}
                      />
                    );
                  })}
                  {contacts.length === 0 ? (
                    <Typography variant="caption" color="text.secondary">
                      No other users yet.
                    </Typography>
                  ) : null}
                </Box>
              </Collapse>
            </Box>

            <Box sx={{ borderTop: "1px solid #EDF2F7", mt: 2, pt: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }} onClick={() => setOverdueOpen(!overdueOpen)}>
                <Typography variant="subtitle2" fontWeight={800} sx={{ color: "#718096" }}>
                  Overdue ({overdueList.length})
                </Typography>
                {overdueOpen ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
              </Box>
              <Collapse in={overdueOpen}>{overdueList.map((ev) => renderTodoCard(ev))}</Collapse>
            </Box>

            <Box sx={{ borderTop: "1px solid #EDF2F7", mt: 2, pt: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }} onClick={() => setUpcomingOpen(!upcomingOpen)}>
                <Typography variant="subtitle2" fontWeight={800}>
                  Upcoming ({upcomingList.length})
                </Typography>
                {upcomingOpen ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
              </Box>
              <Collapse in={upcomingOpen}>{upcomingList.map((ev) => renderTodoCard(ev, { dense: true }))}</Collapse>
            </Box>
          </Paper>

          <Paper
            elevation={0}
            sx={{
              flex: 1,
              minWidth: 0,
              p: 2,
              border: "1px solid #E2E8F0",
              borderRadius: 2,
              minHeight: 560,
            }}
          >
            {loading ? (
              <Typography color="text.secondary">Loading calendar…</Typography>
            ) : view === "day" ? (
              renderDayGrid()
            ) : view === "week" ? (
              renderWeekStrip()
            ) : (
              renderMonthGrid()
            )}
          </Paper>
        </Box>
      </Box>

      <AddTodoModal open={addOpen} onClose={() => setAddOpen(false)} onCreated={fetchEvents} contacts={contacts} />
      <Dialog open={removeConfirmOpen} onClose={handleCancelRemove} maxWidth="xs" fullWidth>
        <DialogTitle>Remove from calendar?</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2">
            You are able to remove this out of the calendar.
          </Typography>
          {removeError ? (
            <Typography color="error" variant="body2" sx={{ mt: 1 }}>
              {removeError}
            </Typography>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelRemove} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleConfirmRemove} variant="contained" color="error" disabled={removing}>
            {removing ? "Removing…" : "Remove"}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={detailsOpen} onClose={closeDetails} maxWidth="sm" fullWidth>
        <DialogTitle>{editingEvent ? "Edit Event" : "Event Details"}</DialogTitle>
        <DialogContent dividers>
          {detailsError ? (
            <Typography color="error" variant="body2" sx={{ mb: 1.5 }}>
              {detailsError}
            </Typography>
          ) : null}
          {!selectedEvent ? null : editingEvent ? (
            <Box sx={{ display: "grid", gap: 1.25, mt: 0.5 }}>
              <TextField
                label="Title"
                value={editEventForm.title}
                onChange={(e) => setEditEventForm((p) => ({ ...p, title: e.target.value }))}
                fullWidth
              />
              <TextField
                label="Description"
                value={editEventForm.description}
                onChange={(e) => setEditEventForm((p) => ({ ...p, description: e.target.value }))}
                fullWidth
                multiline
                minRows={2}
              />
              <TextField
                select
                label="Category"
                value={editEventForm.category}
                onChange={(e) => setEditEventForm((p) => ({ ...p, category: e.target.value }))}
                fullWidth
              >
                {allCategories.map((cat) => (
                  <MenuItem key={cat} value={cat}>
                    {cat}
                  </MenuItem>
                ))}
              </TextField>
              <Box sx={{ display: "flex", gap: 1 }}>
                <TextField
                  type="date"
                  label="Start date"
                  InputLabelProps={{ shrink: true }}
                  value={editEventForm.event_date}
                  onChange={(e) => setEditEventForm((p) => ({ ...p, event_date: e.target.value }))}
                  fullWidth
                />
                <TextField
                  type="time"
                  label="Start time"
                  InputLabelProps={{ shrink: true }}
                  value={editEventForm.event_time}
                  onChange={(e) => setEditEventForm((p) => ({ ...p, event_time: e.target.value }))}
                  fullWidth
                />
              </Box>
              <Box sx={{ display: "flex", gap: 1 }}>
                <TextField
                  type="date"
                  label="End date"
                  InputLabelProps={{ shrink: true }}
                  value={editEventForm.end_date}
                  onChange={(e) => setEditEventForm((p) => ({ ...p, end_date: e.target.value }))}
                  fullWidth
                />
                <TextField
                  type="time"
                  label="End time"
                  InputLabelProps={{ shrink: true }}
                  value={editEventForm.end_time}
                  onChange={(e) => setEditEventForm((p) => ({ ...p, end_time: e.target.value }))}
                  fullWidth
                />
              </Box>
              <ToggleButtonGroup
                size="small"
                exclusive
                value={editEventForm.scope}
                onChange={(_, v) => {
                  if (!v) return;
                  setEditEventForm((p) => ({
                    ...p,
                    scope: v,
                    visibility: v === "group" ? p.visibility || "public" : "private",
                    participant_user_ids: v === "group" ? p.participant_user_ids : [],
                  }));
                }}
              >
                <ToggleButton value="personal">Personal</ToggleButton>
                <ToggleButton value="group">Group</ToggleButton>
              </ToggleButtonGroup>
              {editEventForm.scope === "group" ? (
                <>
                  <Typography variant="subtitle2" sx={{ mt: 0.5 }}>
                    Group visibility
                  </Typography>
                  <ToggleButtonGroup
                    size="small"
                    exclusive
                    value={editEventForm.visibility || "public"}
                    onChange={(_, v) => {
                      if (!v) return;
                      setEditEventForm((p) => {
                        const next = { ...p, visibility: v };
                        if (v === "private") {
                          const fromApi = attendeeRowsToParticipantIds(detailAttendees, contacts);
                          const merged = new Set([
                            ...(p.participant_user_ids || [])
                              .map((x) => Number(x))
                              .filter((id) => Number.isInteger(id) && id > 0),
                            ...fromApi,
                          ]);
                          next.participant_user_ids = [...merged];
                        }
                        return next;
                      });
                    }}
                  >
                    <ToggleButton value="public">Public</ToggleButton>
                    <ToggleButton value="private">Private</ToggleButton>
                  </ToggleButtonGroup>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                    Public appears for everyone; private appears only for selected attendees.
                  </Typography>
                  {(editEventForm.visibility || "public") === "public" ? (
                    <TextField
                      label="Maximum attendees"
                      type="number"
                      fullWidth
                      margin="dense"
                      value={editEventForm.max_attendees}
                      onChange={(e) => setEditEventForm((p) => ({ ...p, max_attendees: e.target.value }))}
                      inputProps={{ min: 1, max: 99999 }}
                      helperText="You can keep this as-is or change how many people may join."
                      sx={{ mt: 1 }}
                    />
                  ) : null}
                  <Typography variant="subtitle2" sx={{ mt: 0.5 }}>
                    Attendees
                  </Typography>
                  <Box sx={{ maxHeight: 220, overflow: "auto", border: "1px solid #E2E8F0", borderRadius: 1 }}>
                    {contacts.map((c) => {
                      const uid = Number(c.user_id);
                      const checked = editEventForm.participant_user_ids.some((x) => Number(x) === uid);
                      return (
                        <FormControlLabel
                          key={c.user_id}
                          control={
                            <Checkbox
                              size="small"
                              checked={checked}
                              onChange={() =>
                                setEditEventForm((p) => {
                                  const set = new Set(p.participant_user_ids.map((x) => Number(x)));
                                  if (set.has(Number(c.user_id))) set.delete(Number(c.user_id));
                                  else set.add(Number(c.user_id));
                                  return { ...p, participant_user_ids: [...set] };
                                })
                              }
                            />
                          }
                          label={c.display_name || c.email}
                          sx={{ display: "flex", ml: 0, px: 1 }}
                        />
                      );
                    })}
                  </Box>
                </>
              ) : null}
            </Box>
          ) : (
            <Box sx={{ display: "grid", gap: 0.7 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.5 }}>
                {selectedEvent.title}
              </Typography>
              {selectedEvent.description ? (
                <Typography variant="body2" color="text.secondary">
                  {selectedEvent.description}
                </Typography>
              ) : null}
              <Typography variant="body2">
                {selectedEvent.event_date} {selectedEvent.event_time} → {selectedEvent.end_date} {selectedEvent.end_time}
              </Typography>
              <Typography variant="body2">Category: {selectedEvent.category}</Typography>
              <Typography variant="body2">
                Type:{" "}
                {(() => {
                  const t = getCalendarEventTypeText(selectedEvent);
                  return t === "—" && detailsLoading ? "Loading..." : t;
                })()}
              </Typography>
              {!isPrivateListing(selectedEvent) ? (
                <Typography variant="body2">
                  Capacity:{" "}
                  {selectedEvent.capacity !== undefined &&
                  selectedEvent.capacity !== null &&
                  selectedEvent.capacity !== ""
                    ? Number(selectedEvent.capacity)
                    : detailsLoading
                      ? "Loading..."
                      : "—"}
                </Typography>
              ) : null}
              <Typography variant="body2" color="text.secondary">
                Owner: {Number(selectedEvent.created_by) === Number(myId) ? "You" : selectedEvent.creator_name || "Unknown"}
              </Typography>
              {detailsLoading ? (
                <Typography variant="caption" color="text.secondary">
                  Loading attendees…
                </Typography>
              ) : detailAttendees.length > 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Attendees:{" "}
                  {detailAttendees
                    .map((a) => a.attendee_name || a.attendee_email)
                    .filter(Boolean)
                    .join(", ")}
                </Typography>
              ) : (
                <Typography variant="caption" color="text.secondary">
                  No invited attendees yet.
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1.5 }}>
          {selectedEvent && Number(selectedEvent.created_by) === Number(myId) && !editingEvent ? (
            <Button onClick={beginEditingEvent} variant="outlined">
              Edit Event
            </Button>
          ) : null}
          {editingEvent ? (
            <>
              <Button onClick={() => setEditingEvent(false)} color="inherit">
                Cancel
              </Button>
              <Button onClick={handleSaveEditedEvent} variant="contained" disabled={detailsSaving}>
                {detailsSaving ? "Saving…" : "Save Changes"}
              </Button>
            </>
          ) : (
            <Button onClick={closeDetails} color="inherit">
              Close
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
