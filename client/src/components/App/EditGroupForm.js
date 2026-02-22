import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  CURRENT_USER_ID,
  getGroupById,
  initStore,
  updateGroup,
} from "./GroupsTemporaryStore";

const CATEGORIES = ["Academic", "Intramural", "Social"];

export default function EditGroupForm() {
  const navigate = useNavigate();
  const { groupId } = useParams();

  const [group, setGroup] = useState(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Academic");
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    initStore();
    const g = getGroupById(groupId);
    setGroup(g);

    if (g) {
      setName(g.name || "");
      setDescription(g.description || "");
      setCategory(g.category || "Academic");
      setIsOpen(!!g.isOpen);
    }
  }, [groupId]);

  const canSubmit = useMemo(() => {
    return name.trim().length >= 3 && description.trim().length >= 5 && !!category;
  }, [name, description, category]);

  if (!group) {
    return (
      <div style={{ maxWidth: 720, margin: "0 auto", padding: 16 }}>
        <button style={secondaryBtn} onClick={() => navigate("/groups")}>
          ← Back
        </button>
        <h2>Group not found</h2>
      </div>
    );
  }

  // simple “permission”: only owner can edit
  if (group.ownerId !== CURRENT_USER_ID) {
    return (
      <div style={{ maxWidth: 720, margin: "0 auto", padding: 16 }}>
        <button style={secondaryBtn} onClick={() => navigate(`/groups/${groupId}`)}>
          ← Back
        </button>
        <h2>No permission</h2>
        <p style={{ color: "#444" }}>Only the owner can edit this group (frontend-only check).</p>
      </div>
    );
  }

  function onSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;

    updateGroup(groupId, {
      name: name.trim(),
      description: description.trim(),
      category,
      isOpen,
    });

    navigate(`/groups/${groupId}`);
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 16 }}>
      <div style={headerRow}>
        <h1 style={{ margin: 0 }}>Edit Group</h1>
        <button style={secondaryBtn} onClick={() => navigate(`/groups/${groupId}`)}>
          ← Back
        </button>
      </div>

      <form onSubmit={onSubmit} style={card}>
        <label style={label}>Group name</label>
        <input style={input} value={name} onChange={(e) => setName(e.target.value)} />

        <label style={label}>Description</label>
        <textarea
          style={{ ...input, minHeight: 90 }}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <label style={label}>Category</label>
        <select style={input} value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <label style={label}>Privacy</label>
        <select
          style={input}
          value={isOpen ? "public" : "private"}
          onChange={(e) => setIsOpen(e.target.value === "public")}
        >
          <option value="public">Public (open join)</option>
          <option value="private">Private (closed)</option>
        </select>

        <button type="submit" disabled={!canSubmit} style={primaryBtn(canSubmit)}>
          Save Changes
        </button>
      </form>
    </div>
  );
}

const headerRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
};

const card = {
  border: "1px solid #ddd",
  borderRadius: 14,
  padding: 16,
  marginTop: 14,
};

const label = { display: "block", marginTop: 12, marginBottom: 6, fontWeight: 700 };

const input = {
  width: "100%",
  padding: 10,
  borderRadius: 10,
  border: "1px solid #ccc",
  outline: "none",
};

const secondaryBtn = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #bbb",
  background: "#fff",
  fontWeight: 800,
  cursor: "pointer",
};

function primaryBtn(enabled) {
  return {
    marginTop: 14,
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid",
    borderColor: enabled ? "#111" : "#bbb",
    background: enabled ? "#111" : "#ccc",
    color: "#fff",
    fontWeight: 900,
    cursor: enabled ? "pointer" : "not-allowed",
  };
}