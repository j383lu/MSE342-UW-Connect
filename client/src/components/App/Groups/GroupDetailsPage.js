// client/src/components/App/Groups/GroupDetailsPage.js

import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";

export default function GroupDetailsPage() {
  const navigate = useNavigate();
  const { groupId } = useParams();

  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isMember, setIsMember] = useState(false);
  const [membersCount, setMembersCount] = useState(0);
  const [isJoining, setIsJoining] = useState(false);
  const [checkingMembership, setCheckingMembership] = useState(true);
  
  // Add a ref to track if we've manually updated the state
  const manuallyUpdated = useRef(false);
  const membershipCheckId = useRef(0); // ✅ add this

  // Hardcoded user ID for now (should come from auth context later)
  const CURRENT_USER_ID = 1;

  useEffect(() => {
    // ✅ reset when group changes (prevents “default Leave” from previous group)
    setIsMember(false);
    setCheckingMembership(true);
    manuallyUpdated.current = false;

    loadGroup();
  }, [groupId]);

  // Check membership after group loads
  useEffect(() => {
    if (group && !manuallyUpdated.current) {
      checkMembership();
    } else {
      // Reset the flag after checking
      manuallyUpdated.current = false;
    }
  }, [group]); // Keep group in dependencies

  async function loadGroup() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(`/api/groups/${groupId}`);
      
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("Group not found");
        }
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      console.log("Group data loaded:", data);
      setGroup(data);
      setMembersCount(data.member_count || 0);
      
    } catch (err) {
      console.error("Error loading group:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function checkMembership() {
    const myCheck = ++membershipCheckId.current; // ✅ unique id for this run

    try {
      setCheckingMembership(true);

      if (!group) return;

      // owner is always a member
      if (Number(group.creator_id) === Number(CURRENT_USER_ID)) {
        if (membershipCheckId.current !== myCheck) return;
        setIsMember(true);
        return;
      }

      const res = await fetch(`/api/users/${CURRENT_USER_ID}/groups/member`);

      if (membershipCheckId.current !== myCheck) return; // ✅ ignore late response

      if (res.ok) {
        const userGroups = await res.json();

        const isMemberOfThisGroup = userGroups.some((g) => {
          const gid = g.group_id ?? g.groupId ?? g.id; // ✅ handle different shapes
          return Number(gid) === Number(groupId);
        });

        setIsMember(isMemberOfThisGroup);
      } else {
        setIsMember(false);
      }
    } catch (err) {
      if (membershipCheckId.current !== myCheck) return;
      setIsMember(false);
    } finally {
      if (membershipCheckId.current === myCheck) {
        setCheckingMembership(false);
      }
    }
  }


  async function handleJoin() {
    if (!group || group.is_private) return;
    
    setIsJoining(true);
    try {
      console.log(`Joining group ${groupId}`);
      const res = await fetch(`/api/groups/${groupId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const responseData = await res.json();
      console.log("Join response:", responseData);

      if (!res.ok) {
        // If already a member, just update the state
        if (responseData.error === 'Already a member of this group') {
          console.log("Already a member, updating state");
          manuallyUpdated.current = true;
          setIsMember(true);
          setMembersCount(prev => prev + 1);
          setGroup(prev => ({
            ...prev,
            member_count: (prev.member_count || 0) + 1
          }));
          return;
        }
        
        throw new Error(responseData.error || 'Failed to join group');
      }

      console.log("Successfully joined group");
      
      // Update local state immediately and set flag
      manuallyUpdated.current = true;
      setIsMember(true);
      setMembersCount(prev => prev + 1);
      setGroup(prev => ({
        ...prev,
        member_count: (prev.member_count || 0) + 1
      }));
      
    } catch (err) {
      console.error("Error joining group:", err);
      alert(err.message);
    } finally {
      setIsJoining(false);
    }
  }

  async function handleLeave() {
    setIsJoining(true);
    try {
      console.log(`Leaving group ${groupId}`);
      const res = await fetch(`/api/groups/${groupId}/leave`, {
        method: 'DELETE'
      });

      const responseData = await res.json();
      console.log("Leave response:", responseData);

      if (!res.ok) {
        // If not a member, just update the state
        if (responseData.error === 'Not a member of this group') {
          console.log("Not a member, updating state");
          manuallyUpdated.current = true;
          setIsMember(false);
          setMembersCount(prev => Math.max(0, prev - 1));
          setGroup(prev => ({
            ...prev,
            member_count: Math.max(0, (prev.member_count || 1) - 1)
          }));
          return;
        }
        
        throw new Error(responseData.error || 'Failed to leave group');
      }

      console.log("Successfully left group");
      
      // Update local state immediately and set flag
      manuallyUpdated.current = true;
      setIsMember(false);
      setMembersCount(prev => Math.max(0, prev - 1));
      setGroup(prev => ({
        ...prev,
        member_count: Math.max(0, (prev.member_count || 1) - 1)
      }));
      
    } catch (err) {
      console.error("Error leaving group:", err);
      alert(err.message);
    } finally {
      setIsJoining(false);
    }
  }

  const isOwner = useMemo(() => {
    return group && group.creator_id === CURRENT_USER_ID;
  }, [group]);

  // Mock data for posts and members
  const posts = useMemo(() => [
    {
      id: 1,
      author: "Van Nguyen",
      time: "2h ago",
      content: "Welcome! Drop an intro + what you're looking for.",
      likes: 7,
      comments: 2
    },
    {
      id: 2,
      author: "Student",
      time: "1d ago",
      content: "Anyone down to meet up this week?",
      likes: 3,
      comments: 1
    }
  ], []);

  const membersPreview = useMemo(() => [
    { name: "Van Nguyen", role: isOwner ? "Owner" : "Member" },
    { name: "Alex Chen", role: "Member" },
    { name: "Sam Taylor", role: "Member" },
    { name: "Jordan Lee", role: "Member" }
  ], [isOwner]);

  if (loading) {
    return (
      <div style={page}>
        <div style={container}>
          <div style={navBar}>
            <button style={backLink} onClick={() => navigate("/groups")}>
              ← Back to Groups
            </button>
          </div>
          <div style={mainCard}>
            <p>Loading group...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div style={page}>
        <div style={container}>
          <div style={navBar}>
            <button style={backLink} onClick={() => navigate("/groups")}>
              ← Back to Groups
            </button>
          </div>
          <div style={mainCard}>
            <h2 style={{ marginTop: 0, color: "#b00020" }}>Error</h2>
            <p style={{ color: "#555" }}>{error || "Group not found"}</p>
          </div>
        </div>
      </div>
    );
  }

  const createdDate = new Date().toLocaleDateString();

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
                onClick={() => navigate(`/groups/${group.group_id}/edit`)}
              >
                Edit Group
              </button>
            ) : null}

            {!checkingMembership && (
              isMember ? (
                <button 
                  style={btn("danger")} 
                  onClick={handleLeave}
                  disabled={isJoining}
                >
                  {isJoining ? 'Leaving...' : 'Leave Group'}
                </button>
              ) : (
                <button
                  style={btn("primary", group.is_private)}
                  onClick={handleJoin}
                  disabled={group.is_private || isJoining}
                  title={group.is_private ? "Private group - join by invitation only" : ""}
                >
                  {isJoining ? 'Joining...' : 'Join Group'}
                </button>
              )
            )}
          </div>
        </div>

        {/* Group Cover with Image */}
        <div style={cover}>
          {group.image_url ? (
            <img 
              src={`/uploads/${group.image_url}`} 
              alt={group.name}
              style={coverImage}
            />
          ) : null}
          <div style={avatar}>
            {group.image_url ? null : "👥"}
          </div>
        </div>

        {/* Main Content */}
        <div style={mainCard}>
          {/* Header */}
          <div style={groupHeader}>
            <div style={titleSection}>
              <h1 style={groupTitle}>{group.name}</h1>

              <div style={groupMeta}>
                <span style={metaItem}>📅 Created {createdDate}</span>
                <span style={metaItem}>
                  👤 Created by {isOwner ? "You" : `User ${group.creator_id}`}
                </span>
                {group.max_members && (
                  <span style={metaItem}>
                    👥 Max {group.max_members} members
                  </span>
                )}
              </div>

              <div style={badges}>
                <span style={badge(group.is_private ? "private" : "public")}>
                  {group.is_private ? "Private Group" : "Public Group"}
                </span>
                <span style={badge("category")}>{group.category}</span>
                {isOwner && <span style={badge("owner")}>Owner</span>}
                {isMember && <span style={badge("member")}>Member</span>}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div style={statsGrid}>
            <StatItem value={membersCount} label="Members" />
            <StatItem value={group.max_members || "∞"} label="Max Members" />
            <StatItem value="12" label="Posts" />
            <StatItem value="3" label="Events" />
          </div>

          {/* About */}
          <div style={section}>
            <h3 style={sectionTitle}>About</h3>
            <p style={description}>{group.description}</p>
          </div>

          {/* Tags */}
          <div style={section}>
            <h3 style={sectionTitle}>Tags</h3>
            <div style={tagsList}>
              <span style={tagPill}>{group.category.toLowerCase()}</span>
              <span style={tagPill}>students</span>
              <span style={tagPill}>campus</span>
            </div>
          </div>

          {/* Members Preview */}
          <div style={section}>
            <h3 style={sectionTitle}>
              Members ({membersCount})
            </h3>

            <div style={membersGrid}>
              {membersPreview.map((m, index) => (
                <div key={index} style={memberCard}>
                  <div style={memberAvatar}>{initials(m.name)}</div>
                  <div>
                    <div style={memberName}>{m.name}</div>
                    <div style={memberRole}>{m.role}</div>
                  </div>
                </div>
              ))}
            </div>

            {membersCount > 4 && (
              <div style={{ marginTop: 10, color: "#666", fontSize: 13 }}>
                and {membersCount - 4} more members...
              </div>
            )}
          </div>

          {/* Posts Preview */}
          <div style={section}>
            <h3 style={sectionTitle}>Posts</h3>

            <div style={postsList}>
              {posts.map(post => (
                <PostCard
                  key={post.id}
                  author={post.author}
                  time={post.time}
                  content={post.content}
                  likes={post.likes}
                  comments={post.comments}
                />
              ))}
            </div>

            <div style={createPost}>
              <textarea
                style={createPostTextarea}
                placeholder="Write a post... (coming soon)"
                disabled
              />
              <div style={createPostActions}>
                <button style={btn("primary", true)} disabled>
                  Post
                </button>
              </div>
              <div style={{ marginTop: 8, color: "#666", fontSize: 12 }}>
                * Posting feature coming soon
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

/* ---------- styles ---------- */
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
  overflow: "hidden",
};

const coverImage = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
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

  if (kind === "public") return { ...base, background: "#e8f5e8" };
  if (kind === "private") return { ...base, background: "#fff0f0", color: "#b00020" };
  if (kind === "category") return { ...base, background: "#f0f0f0" };
  if (kind === "owner") return { ...base, background: "#111", color: "#fff", borderColor: "#111" };
  if (kind === "member") return { ...base, background: "#e3f2fd", color: "#1976d2", borderColor: "#1976d2" };
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
    opacity: disabled ? 0.5 : 1,
  };

  if (kind === "primary") {
    return { ...base, background: "#111", color: "#fff", borderColor: "#111" };
  }
  if (kind === "secondary") {
    return { ...base, background: "#fff", color: "#111", borderColor: "#bbb" };
  }
  if (kind === "danger") {
    return { ...base, background: "#fff", color: "#b00020", borderColor: "#b00020" };
  }
  return base;
}