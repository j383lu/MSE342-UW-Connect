// client/src/components/App/GroupsPage.js

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CURRENT_USER_ID,
  initStore,
  getGroups,
  getMemberships,
  joinGroup,
  leaveGroup,
} from "./GroupsTemporaryStore";

const FILTERS = ["All", "Academic", "Intramural", "Social"];

export default function GroupsPage() {
  const navigate = useNavigate();

  const [groups, setGroups] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");

  useEffect(() => {
    initStore();
    refresh();
  }, []);

  function refresh() {
    setGroups(getGroups());
    setMemberships(getMemberships());
  }

  function handleJoin(groupId) {
    joinGroup(groupId);
    refresh();
  }

  function handleLeave(groupId) {
    leaveGroup(groupId);
    refresh();
  }

  const ownedGroups = useMemo(() => {
    return groups.filter((g) => g.ownerId === CURRENT_USER_ID);
  }, [groups]);

  const myGroups = useMemo(() => {
    return groups.filter((g) => memberships.includes(g.id));
  }, [groups, memberships]);

  const discoverGroups = useMemo(() => {
    const q = search.trim().toLowerCase();

    return groups
      .filter((g) => !memberships.includes(g.id))
      .filter((g) => (filter === "All" ? true : g.category === filter))
      .filter((g) => {
        if (!q) return true;
        return (
          g.name.toLowerCase().includes(q) ||
          g.description.toLowerCase().includes(q)
        );
      });
  }, [groups, memberships, filter, search]);

  return (
    <div style={{ maxWidth: 950, margin: "0 auto", padding: 16 }}>
      {/* Header */}
      <div style={headerRow}>
        <h1 style={{ margin: 0 }}>Groups</h1>

        <button style={primaryBtn} onClick={() => navigate("/groups/new")}>
          + Create Group
        </button>
      </div>

      {/* Owned Groups */}
      <section style={{ marginTop: 18 }}>
        <h2 style={{ marginBottom: 10 }}>Owned Groups</h2>

        {ownedGroups.length === 0 ? (
          <p style={{ color: "#444" }}>
            You haven’t created any groups yet. Click “Create Group” to make one!
          </p>
        ) : (
          ownedGroups.map((g) => (
            <div key={g.id} style={ownedRow}>
              <div
                style={{ flex: 1, cursor: "pointer" }}
                onClick={() => navigate(`/groups/${g.id}`)}
              >
                <h3 style={{ margin: 0 }}>{g.name}</h3>
                <p style={{ margin: "6px 0 0", color: "#444" }}>
                  {g.description}
                </p>

                <div style={metaRow}>
                  <span style={pill}>{g.category}</span>
                  <span
                    style={{
                      ...pill,
                      background: g.isOpen ? "#e9f7ef" : "#fdecea",
                    }}
                  >
                    {g.isOpen ? "Open" : "Closed"}
                  </span>
                </div>
              </div>

              <button
                style={secondaryBtn}
                onClick={() => navigate(`/groups/${g.id}/edit`)}
              >
                Edit Group
              </button>
            </div>
          ))
        )}
      </section>

      {/* My Groups */}
      <section style={{ marginTop: 26 }}>
        <h2 style={{ marginBottom: 10 }}>My Groups</h2>

        {myGroups.length === 0 ? (
          <p style={{ color: "#444" }}>
            You’re not in any groups yet. Join one below!
          </p>
        ) : (
          myGroups.map((g) => (
            <GroupCardRow
              key={g.id}
              group={g}
              isMember={true}
              onJoin={handleJoin}
              onLeave={handleLeave}
              onOpen={() => navigate(`/groups/${g.id}`)}
            />
          ))
        )}
      </section>

      {/* Discover Groups */}
      <section style={{ marginTop: 26 }}>
        <h2 style={{ marginBottom: 10 }}>Discover Groups</h2>

        <div style={toolbar}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={pillBtn(f === filter)}
              >
                {f}
              </button>
            ))}
          </div>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search groups..."
            style={searchInput}
          />
        </div>

        <div style={{ marginTop: 12 }}>
          {discoverGroups.length === 0 ? (
            <p style={{ color: "#444" }}>No groups match your filter/search.</p>
          ) : (
            discoverGroups.map((g) => (
              <GroupCardRow
                key={g.id}
                group={g}
                isMember={false}
                onJoin={handleJoin}
                onLeave={handleLeave}
                onOpen={() => navigate(`/groups/${g.id}`)}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}

/** Clickable "card row". Join/Leave buttons don't navigate. */
function GroupCardRow({ group, isMember, onJoin, onLeave, onOpen }) {
  return (
    <div onClick={onOpen} style={card}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h3 style={{ margin: 0 }}>{group.name}</h3>
          <p style={{ margin: "6px 0 0", color: "#444" }}>{group.description}</p>

          <div style={metaRow}>
            <span style={pill}>{group.category}</span>
            <span
              style={{
                ...pill,
                background: group.isOpen ? "#e9f7ef" : "#fdecea",
              }}
            >
              {group.isOpen ? "Open" : "Closed"}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start" }}>
          {isMember ? (
            <button
              style={secondaryBtn}
              onClick={(e) => {
                e.stopPropagation();
                onLeave(group.id);
              }}
            >
              Leave
            </button>
          ) : (
            <button
              style={primaryBtn}
              disabled={!group.isOpen}
              onClick={(e) => {
                e.stopPropagation();
                onJoin(group.id);
              }}
              title={!group.isOpen ? "Closed groups will need invites later" : ""}
            >
              Join
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- styles ---------------- */

const headerRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
};

const toolbar = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};

const ownedRow = {
  border: "1px solid #ddd",
  borderRadius: 12,
  padding: 14,
  marginBottom: 12,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
};

const card = {
  border: "1px solid #ddd",
  borderRadius: 12,
  padding: 14,
  marginBottom: 12,
  cursor: "pointer",
};

const metaRow = {
  marginTop: 10,
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const pill = {
  fontSize: 12,
  padding: "4px 8px",
  borderRadius: 999,
  background: "#f3f3f3",
};

const searchInput = {
  minWidth: 240,
  flex: "1 1 260px",
  padding: 10,
  borderRadius: 10,
  border: "1px solid #ccc",
  outline: "none",
};

function pillBtn(active) {
  return {
    padding: "8px 12px",
    borderRadius: 999,
    border: "1px solid",
    borderColor: active ? "#111" : "#ccc",
    background: active ? "#111" : "#fff",
    color: active ? "#fff" : "#111",
    cursor: "pointer",
    fontWeight: 700,
  };
}

const primaryBtn = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #111",
  background: "#111",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
};

const secondaryBtn = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #bbb",
  background: "#fff",
  color: "#111",
  fontWeight: 800,
  cursor: "pointer",
};