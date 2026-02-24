// client/src/components/App/Groups/GroupDetailsPage.js

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  CURRENT_USER_ID,
  initStore,
  getGroupById,
  getMemberships,
  joinGroup,
  leaveGroup,
} from "./GroupsTemporaryStore";

export default function GroupDetailsPage() {
  const navigate = useNavigate();
  const { groupId } = useParams();

  const [group, setGroup] = useState(null);
  const [memberships, setMemberships] = useState([]);

  useEffect(() => {
    initStore();
    setGroup(getGroupById(groupId));
    setMemberships(getMemberships());
  }, [groupId]);

  const isMember = useMemo(() => {
    if (!group) return false;
    return memberships.includes(group.id);
  }, [memberships, group]);

  const isOwner = useMemo(() => {
    if (!group) return false;
    return group.ownerId === CURRENT_USER_ID;
  }, [group]);

  // fake stats/members (frontend only)
  const stats = useMemo(() => {
    if (!group) return null;

    // deterministic-ish fake numbers based on id
    const seed = group.id.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    const membersCount = isMember ? 12 + (seed % 40) : 10 + (seed % 35);
    const postsCount = 3 + (seed % 18);
    const eventsCount = 1 + (seed % 6);
    const activity = 50 + (seed % 45);

    return { membersCount, postsCount, eventsCount, activity };
  }, [group, isMember]);

  const membersPreview = useMemo(() => {
    // fake member list
    const base = [
      { name: "Van Nguyen", role: isOwner ? "Owner" : "Member" },
      { name: "Member 1", role: "Member" },
      { name: "Member 2", role: "Member" },
      { name: "Member 3", role: "Member" },
      { name: "Member 4", role: "Member" },
    ];
    return base.slice(0, 4);
  }, [isOwner]);

  if (!group) {
    return (
      <div style={page}>
        <div style={container}>
          <div style={navBar}>
            <button style={backLink} onClick={() => navigate("/groups")}>
              ← Back to Groups
            </button>
          </div>
          <div style={mainCard}>
            <h2 style={{ marginTop: 0 }}>Group not found</h2>
            <p style={{ color: "#555" }}>This group id doesn’t exist.</p>
          </div>
        </div>
      </div>
    );
  }

  function handleJoin() {
    if (!group.isOpen) return;
    joinGroup(group.id);
    setMemberships(getMemberships());
  }

  function handleLeave() {
    leaveGroup(group.id);
    setMemberships(getMemberships());
  }

  const createdText = new Date(group.createdAt).toLocaleDateString();

  return (
    <div style={page}>
      <div style={container}>
        {/* Navigation */}
        <div style={navBar}>
          <button style={backLink} onClick={() => navigate("/groups")}>
            ← Back to Groups
          </button>

          <div style={actionButtons}>
            {isOwner ? (
              <button
                style={btn("secondary")}
                onClick={() => navigate(`/groups/${group.id}/edit`)}
              >
                Edit Group
              </button>
            ) : null}

            {isMember ? (
              <button style={btn("danger")} onClick={handleLeave}>
                Leave Group
              </button>
            ) : (
              <button
                style={btn("primary", !group.isOpen)}
                onClick={handleJoin}
                disabled={!group.isOpen}
                title={!group.isOpen ? "Private group (invite later)" : ""}
              >
                Join Group
              </button>
            )}
          </div>
        </div>

        {/* Group Cover */}
        <div style={cover}>
          <div style={avatar}>👥</div>
        </div>

        {/* Main Content */}
        <div style={mainCard}>
          {/* Header */}
          <div style={groupHeader}>
            <div style={titleSection}>
              <h1 style={groupTitle}>{group.name}</h1>

              <div style={groupMeta}>
                <span style={metaItem}>📅 Created {createdText}</span>
                <span style={metaItem}>
                  👤 Created by {isOwner ? "You" : "Student"}
                </span>
              </div>

              <div style={badges}>
                <span style={badge(group.isOpen ? "public" : "private")}>
                  {group.isOpen ? "Public Group" : "Private Group"}
                </span>
                <span style={badge("category")}>{group.category}</span>
                {isOwner ? <span style={badge("owner")}>Owner</span> : null}
                {isMember ? <span style={badge("member")}>Member</span> : null}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div style={statsGrid}>
            <StatItem value={stats.membersCount} label="Members" />
            <StatItem value={stats.postsCount} label="Posts" />
            <StatItem value={stats.eventsCount} label="Events" />
            <StatItem value={`${stats.activity}%`} label="Activity" />
          </div>

          {/* About */}
          <div style={section}>
            <h3 style={sectionTitle}>About</h3>
            <p style={description}>{group.description}</p>
          </div>

          {/* Tags (placeholder for now) */}
          <div style={section}>
            <h3 style={sectionTitle}>Tags</h3>
            <div style={tagsList}>
              {/* For now: show category as a tag; you can upgrade store to save tags later */}
              <span style={tagPill}>{group.category.toLowerCase()}</span>
              <span style={tagPill}>students</span>
              <span style={tagPill}>campus</span>
            </div>
          </div>

          {/* Members Preview */}
          <div style={section}>
            <h3 style={sectionTitle}>
              Members ({stats.membersCount})
            </h3>

            <div style={membersGrid}>
              {membersPreview.map((m) => (
                <div key={m.name} style={memberCard}>
                  <div style={memberAvatar}>{initials(m.name)}</div>
                  <div>
                    <div style={memberName}>{m.name}</div>
                    <div style={memberRole}>{m.role}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 10, color: "#666", fontSize: 12 }}>
              * Members list is demo data (frontend-only)
            </div>
          </div>

          {/* Posts Preview (demo) */}
          <div style={section}>
            <h3 style={sectionTitle}>Posts</h3>

            <div style={postsList}>
              <PostCard
                author="Student"
                time="2h ago"
                content="Welcome! Drop an intro + what you’re looking for."
                likes={7}
                comments={2}
              />
              <PostCard
                author="Student"
                time="1d ago"
                content="Anyone down to meet up this week?"
                likes={3}
                comments={1}
              />
            </div>

            <div style={createPost}>
              <textarea
                style={createPostTextarea}
                placeholder="Write a post... (demo UI only)"
                disabled
              />
              <div style={createPostActions}>
                <button style={btn("primary", true)} disabled title="Demo only">
                  Post
                </button>
              </div>
              <div style={{ marginTop: 8, color: "#666", fontSize: 12 }}>
                * Posting is demo UI for now (add later)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- small components ---------- */

function StatItem({ value, label }) {
  return (
    <div style={statItem}>
      <div style={statValue}>{value}</div>
      <div style={statLabel}>{label}</div>
    </div>
  );
}

function PostCard({ author, time, content, likes, comments }) {
  return (
    <div style={postCard}>
      <div style={postHeader}>
        <div style={postAuthor}>
          <div style={postAuthorAvatar} />
          <div>
            <div style={postAuthorName}>{author}</div>
            <div style={postAuthorTime}>{time}</div>
          </div>
        </div>
      </div>

      <div style={postContent}>{content}</div>

      <div style={postStats}>
        <span>👍 {likes}</span>
        <span>💬 {comments}</span>
      </div>
    </div>
  );
}

function initials(name) {
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.[0] || "";
  const b = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (a + b).toUpperCase();
}

/* ---------- styles (black/grey scheme) ---------- */

const page = {
  backgroundColor: "#f5f5f5",
  minHeight: "100vh",
  padding: 20,
};

const container = {
  maxWidth: 1000,
  margin: "0 auto",
};

const navBar = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 20,
  padding: "10px 0",
};

const backLink = {
  border: "none",
  background: "transparent",
  color: "#666",
  cursor: "pointer",
  fontSize: 16,
  display: "flex",
  alignItems: "center",
  gap: 6,
};

const actionButtons = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

const cover = {
  height: 300,
  borderRadius: "12px 12px 0 0",
  position: "relative",
  marginBottom: 80,
  background: "linear-gradient(135deg, #111 0%, #444 100%)",
};

const avatar = {
  width: 120,
  height: 120,
  background: "white",
  borderRadius: "50%",
  position: "absolute",
  bottom: -60,
  left: 40,
  border: "4px solid white",
  boxShadow: "0 2px 10px rgba(0,0,0,0.12)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 48,
  color: "#111",
};

const mainCard = {
  background: "white",
  borderRadius: 12,
  boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
  padding: 30,
  marginTop: -50,
  border: "1px solid #eee",
};

const groupHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: 20,
  paddingLeft: 140,
};

const titleSection = {
  width: "100%",
};

const groupTitle = {
  fontSize: 32,
  color: "#111",
  marginBottom: 10,
};

const groupMeta = {
  display: "flex",
  gap: 20,
  color: "#666",
  fontSize: 14,
  flexWrap: "wrap",
};

const metaItem = {
  display: "flex",
  alignItems: "center",
  gap: 6,
};

const badges = {
  display: "flex",
  gap: 10,
  marginTop: 10,
  flexWrap: "wrap",
};

function badge(kind) {
  const base = {
    padding: "4px 12px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 700,
    border: "1px solid #ddd",
    background: "#f5f5f5",
    color: "#111",
  };

  if (kind === "public") return { ...base, background: "#f3f3f3" };
  if (kind === "private") return { ...base, background: "#fafafa", color: "#333" };
  if (kind === "category") return { ...base, background: "#f3f3f3" };
  if (kind === "owner") return { ...base, background: "#111", color: "#fff", borderColor: "#111" };
  if (kind === "member") return { ...base, background: "#fff", color: "#111" };
  return base;
}

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: 20,
  margin: "30px 0",
  padding: "20px 0",
  borderTop: "1px solid #eee",
  borderBottom: "1px solid #eee",
};

const statItem = { textAlign: "center" };
const statValue = { fontSize: 24, fontWeight: 900, color: "#111" };
const statLabel = { fontSize: 14, color: "#666", marginTop: 5 };

const section = { marginBottom: 30 };
const sectionTitle = { fontSize: 18, fontWeight: 900, color: "#111", marginBottom: 15 };
const description = { color: "#555", lineHeight: 1.6 };

const tagsList = { display: "flex", flexWrap: "wrap", gap: 10 };
const tagPill = {
  backgroundColor: "#f5f5f5",
  color: "#666",
  padding: "6px 16px",
  borderRadius: 20,
  fontSize: 13,
  border: "1px solid #eee",
};

const membersGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
  gap: 20,
};

const memberCard = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: 10,
  borderRadius: 8,
  backgroundColor: "#f9f9f9",
  border: "1px solid #eee",
};

const memberAvatar = {
  width: 40,
  height: 40,
  borderRadius: "50%",
  background: "linear-gradient(135deg, #111 0%, #444 100%)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#fff",
  fontWeight: 900,
  fontSize: 13,
};

const memberName = { fontSize: 14, fontWeight: 900, color: "#111" };
const memberRole = { fontSize: 12, color: "#777", marginTop: 2 };

const postsList = { display: "flex", flexDirection: "column", gap: 15 };

const postCard = {
  padding: 20,
  border: "1px solid #eee",
  borderRadius: 8,
};

const postHeader = { display: "flex", justifyContent: "space-between", marginBottom: 10 };

const postAuthor = { display: "flex", alignItems: "center", gap: 10 };

const postAuthorAvatar = {
  width: 32,
  height: 32,
  borderRadius: "50%",
  background: "linear-gradient(135deg, #111 0%, #444 100%)",
};

const postAuthorName = { fontSize: 14, fontWeight: 900, color: "#111" };
const postAuthorTime = { fontSize: 12, color: "#999", marginTop: 2 };

const postContent = { color: "#555", lineHeight: 1.6, marginBottom: 10 };

const postStats = { display: "flex", gap: 20, color: "#999", fontSize: 13 };

const createPost = { marginTop: 20 };

const createPostTextarea = {
  width: "100%",
  padding: 12,
  border: "1px solid #ddd",
  borderRadius: 8,
  resize: "vertical",
  minHeight: 80,
  fontSize: 14,
  outline: "none",
  background: "#fafafa",
};

const createPostActions = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
  marginTop: 10,
};

function btn(kind, disabled = false) {
  const base = {
    padding: "10px 20px",
    border: "1px solid",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 800,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
  };

  if (kind === "primary") {
    return { ...base, background: "#111", color: "#fff", borderColor: "#111" };
  }
  if (kind === "secondary") {
    return { ...base, background: "#fff", color: "#111", borderColor: "#bbb" };
  }
  if (kind === "danger") {
    return { ...base, background: "#fff", color: "#111", borderColor: "#111" };
  }
  return base;
}