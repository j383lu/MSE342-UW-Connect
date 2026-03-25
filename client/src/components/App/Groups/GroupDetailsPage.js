// client/src/components/App/Groups/GroupDetailsPage.js

import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import apiRequest from "../../../utils/api";
import FeedPostCard from "../../Post/PostCard";
import CreatePostForm from "../../Post/CreatePostForm";

export default function GroupDetailsPage() {
  const navigate = useNavigate();
  const { groupId } = useParams();

  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isMember, setIsMember] = useState(false);
  const [membersCount, setMembersCount] = useState(0);
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [checkingMembership, setCheckingMembership] = useState(true);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteFeedback, setInviteFeedback] = useState("");
  const [groupPosts, setGroupPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [postsError, setPostsError] = useState("");
  const [createPostOpen, setCreatePostOpen] = useState(false);
  const [privateGroupModalOpen, setPrivateGroupModalOpen] = useState(false);
  
  // Add a ref to track if we've manually updated the state
  const manuallyUpdated = useRef(false);

  // Current app user id (set after login and stored in localStorage)
  const storedUserIdRaw = localStorage.getItem('currentUserId');
  const CURRENT_USER_ID = storedUserIdRaw ? Number(storedUserIdRaw) : null;

  useEffect(() => {
    loadGroup();
    loadGroupPosts();
  }, [groupId]);

  // Check membership after group loads
  useEffect(() => {
    if (group && !manuallyUpdated.current) {
      checkMembership();
      loadGroupMembers();
    } else {
      // Reset the flag after checking
      manuallyUpdated.current = false;
    }
  }, [group]);

  async function loadGroup() {
    try {
      setLoading(true);
      setError("");

      const res = await apiRequest(`/api/groups/${groupId}`);
      
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

  // Function to load actual group members with names
  async function loadGroupMembers() {
    if (!groupId) return;
    
    try {
      setLoadingMembers(true);
      const res = await apiRequest(`/api/groups/${groupId}/members`);
      if (res.ok) {
        const data = await res.json();
        console.log("Group members with details:", data);
        setMembers(data);
      } else {
        console.error("Failed to load members:", res.status);
      }
    } catch (err) {
      console.error("Error loading group members:", err);
    } finally {
      setLoadingMembers(false);
    }
  }

  async function checkMembership() {
    try {
      setCheckingMembership(true);
      console.log(`Checking membership for user ${CURRENT_USER_ID} in group ${groupId}`);
      
      if (!group) {
        console.log("No group data yet");
        setCheckingMembership(false);
        return;
      }
      
      // First check if user is the owner
      if (CURRENT_USER_ID && group.creator_id === CURRENT_USER_ID) {
        console.log("User is the owner");
        // Check if owner is also a member (from Group_Members)
        const res = await apiRequest(`/api/users/${CURRENT_USER_ID}/groups/member`);
        
        if (res.ok) {
          const userGroups = await res.json();
          const isMemberOfThisGroup = userGroups.some(g => 
            Number(g.group_id) === Number(groupId)
          );
          console.log("Owner is member?", isMemberOfThisGroup);
          setIsMember(isMemberOfThisGroup);
        } else {
          setIsMember(false);
        }
        setCheckingMembership(false);
        return;
      }
      
      // For non-owners, check memberships
      console.log("User is not the owner, checking memberships...");
      const res = await apiRequest(`/api/users/${CURRENT_USER_ID}/groups/member`);
      
      if (res.ok) {
        const userGroups = await res.json();
        console.log("User's groups from API:", userGroups);
        
        const isMemberOfThisGroup = userGroups.some(g => 
          Number(g.group_id) === Number(groupId)
        );
        
        console.log(`Is group ${groupId} in user's groups?`, isMemberOfThisGroup);
        setIsMember(isMemberOfThisGroup);
      } else {
        console.log("Failed to fetch user memberships, assuming not a member");
        setIsMember(false);
      }
    } catch (err) {
      console.error("Error checking membership:", err);
      setIsMember(false);
    } finally {
      setCheckingMembership(false);
    }
  }

  async function loadGroupPosts() {
    if (!groupId) return;
    try {
      setLoadingPosts(true);
      setPostsError("");
      const res = await apiRequest(`/api/groups/${groupId}/posts`);
      const data = await res.json().catch(() => []);

      if (!res.ok) {
        setPostsError(data?.error || "Failed to load group posts");
        setGroupPosts([]);
        return;
      }

      setGroupPosts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error loading group posts:", err);
      setPostsError("Failed to load group posts");
      setGroupPosts([]);
    } finally {
      setLoadingPosts(false);
    }
  }

  async function handleLikePost(postId) {
    try {
      const res = await apiRequest(`/api/posts/${postId}/like`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return;
      }

      setGroupPosts((prev) =>
        prev.map((p) =>
          p.post_id === postId
            ? { ...p, like_count: data.like_count, liked_by_me: data.liked_by_me }
            : p
        )
      );
    } catch (err) {
      console.error("Error liking post:", err);
    }
  }

  async function handleCreatePost(newPost) {
    try {
      const res = await apiRequest("/api/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: newPost.title,
          content: newPost.description,
          tags: newPost.tags,
          group_id: Number(groupId),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "Failed to create post");
        return;
      }

      setCreatePostOpen(false);
      await loadGroupPosts();
    } catch (err) {
      console.error("Error creating post:", err);
      alert("Failed to create post");
    }
  }

  async function handleJoin() {
    // Allow owner to join even if the group is private
    if (!group) return;
    if (group.is_private && group.creator_id !== CURRENT_USER_ID) return;
    
    setIsJoining(true);
    try {
      console.log(`Joining group ${groupId}`);
      const res = await apiRequest(`/api/groups/${groupId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId: CURRENT_USER_ID })
      });

      const responseData = await res.json();
      console.log("Join response:", responseData);

      if (!res.ok) {
        if (responseData.error === 'Already a member of this group') {
          console.log("Already a member, updating state");
          manuallyUpdated.current = true;
          setIsMember(true);
          setMembersCount(prev => prev + 1);
          setGroup(prev => ({
            ...prev,
            member_count: (prev.member_count || 0) + 1
          }));
          loadGroupMembers(); // Reload members
          return;
        }
        
        throw new Error(responseData.error || 'Failed to join group');
      }

      console.log("Successfully joined group");
      
      manuallyUpdated.current = true;
      setIsMember(true);
      setMembersCount(prev => prev + 1);
      setGroup(prev => ({
        ...prev,
        member_count: (prev.member_count || 0) + 1
      }));
      loadGroupMembers(); // Reload members
      
    } catch (err) {
      console.error("Error joining group:", err);
      alert(err.message);
    } finally {
      setIsJoining(false);
    }
  }

  async function handleRequestAccess() {
    if (!groupId) return;
    try {
      const res = await apiRequest(`/api/groups/${groupId}/request-access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setPrivateGroupModalOpen(false);
        setInviteFeedback("Your request has been sent to the group owner.");
      } else {
        alert(data.error || "Failed to send request");
      }
    } catch (err) {
      console.error("Error requesting access:", err);
      alert("Failed to send request");
    }
  }

  async function handleLeave() {
    setIsJoining(true);
    try {
      console.log(`Leaving group ${groupId}`);
      const res = await apiRequest(`/api/groups/${groupId}/leave`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId: CURRENT_USER_ID })
      });

      const responseData = await res.json();
      console.log("Leave response:", responseData);

      if (!res.ok) {
        if (responseData.error === 'Not a member of this group') {
          console.log("Not a member, updating state");
          manuallyUpdated.current = true;
          setIsMember(false);
          setMembersCount(prev => Math.max(0, prev - 1));
          setGroup(prev => ({
            ...prev,
            member_count: Math.max(0, (prev.member_count || 1) - 1)
          }));
          loadGroupMembers(); // Reload members
          return;
        }
        
        throw new Error(responseData.error || 'Failed to leave group');
      }

      console.log("Successfully left group");
      
      manuallyUpdated.current = true;
      setIsMember(false);
      setMembersCount(prev => Math.max(0, prev - 1));
      setGroup(prev => ({
        ...prev,
        member_count: Math.max(0, (prev.member_count || 1) - 1)
      }));
      loadGroupMembers(); // Reload members
      
    } catch (err) {
      console.error("Error leaving group:", err);
      alert(err.message);
    } finally {
      setIsJoining(false);
    }
  }

  const isOwner = useMemo(() => {
    return group && CURRENT_USER_ID && group.creator_id === CURRENT_USER_ID;
  }, [group, CURRENT_USER_ID]);

  async function handleSendInvite(e) {
    e.preventDefault();
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;
    setInviteError("");
    setInviting(true);
    try {
      const res = await apiRequest(`/api/groups/${groupId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails: [email], inviterId: CURRENT_USER_ID })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.code === "already_member" && data.userName) {
          setInviteFeedback(`${data.userName} is already a member of the group`);
        } else {
          setInviteError(data.error || "Failed to send invite");
        }
        return;
      }
      setInviteEmail("");
      setInviteModalOpen(false);
      if (data.invitedName) {
        setInviteFeedback(`Invitation sent to ${data.invitedName}`);
      } else {
        setInviteFeedback(`Invitation sent to ${email}`);
      }
    } catch (err) {
      setInviteError("Failed to send invite");
    } finally {
      setInviting(false);
    }
  }

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
        {/* Invite feedback popup */}
        {inviteFeedback && (
          <div style={feedbackOverlay}>
            <div style={feedbackCard}>
              <button
                type="button"
                onClick={() => setInviteFeedback("")}
                style={feedbackClose}
                aria-label="Close"
              >
                ×
              </button>
              <div style={feedbackText}>{inviteFeedback}</div>
            </div>
          </div>
        )}

        {/* Private group invite-only modal */}
        {privateGroupModalOpen && (
          <div style={modalOverlay} onClick={() => setPrivateGroupModalOpen(false)}>
            <div style={privateGroupModalCard} onClick={(e) => e.stopPropagation()}>
              <p style={privateGroupModalText}>This group is Invite-only.</p>
              <div style={privateGroupModalActions}>
                <button
                  style={privateGroupModalRequestBtn}
                  onClick={() => handleRequestAccess()}
                >
                  Request Access
                </button>
                <button
                  style={privateGroupModalCancelBtn}
                  onClick={() => setPrivateGroupModalOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

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

            {!checkingMembership ? (
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
                  style={btn("primary", isJoining)}
                  onClick={() => {
                    if (group.is_private && !isOwner) {
                      setPrivateGroupModalOpen(true);
                    } else {
                      handleJoin();
                    }
                  }}
                  disabled={isJoining}
                  title={
                    group.is_private && !isOwner
                      ? "Private group - join by invitation only"
                      : ""
                  }
                >
                  {isJoining ? 'Joining...' : 'Join Group'}
                </button>
              )
            ) : (
              <button style={btn("secondary")} disabled>
                Loading...
              </button>
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
            <StatItem value={groupPosts.length} label="Posts" />
            <StatItem value="3" label="Events" />
          </div>

          {/* About */}
          <div style={section}>
            <h3 style={sectionTitle}>About</h3>
            <p style={description}>{group.description}</p>
          </div>

          {/* Category */}
          <div style={section}>
            <h3 style={sectionTitle}>Category</h3>
            <div style={categoryDisplay}>
              <span style={categoryPill}>{group.category}</span>
            </div>
          </div>

          {/* Members List - Now showing actual members with names and roles */}
          <div style={section}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
              <h3 style={{ ...sectionTitle, margin: 0 }}>
                Members ({membersCount})
              </h3>
              {isOwner && group.is_private === 1 && (
                <button
                  type="button"
                  style={inviteButton}
                  onClick={() => {
                    setInviteModalOpen(true);
                    setInviteEmail("");
                    setInviteError("");
                  }}
                >
                  + Invite
                </button>
              )}
            </div>

            {loadingMembers ? (
              <p>Loading members...</p>
            ) : (
              <div style={membersGrid}>
                {members.length > 0 ? (
                  members.map((member, index) => (
                    <div
                      key={index}
                      style={memberCard}
                      onClick={() => navigate(`/users/${member.user_id}`)}
                      role="button"
                      tabIndex={0}
                      aria-label={`View profile of ${member.display_name || `User ${member.user_id}`}`}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          navigate(`/users/${member.user_id}`);
                        }
                      }}
                    >
                      <div style={memberAvatar}>
                        {member.display_name ? initials(member.display_name) : "👤"}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={memberName}>
                          {member.display_name || `User ${member.user_id}`}
                          {member.user_id === CURRENT_USER_ID && " (You)"}
                        </div>
                        <div style={memberRole}>
                          {member.role === 'owner' ? 'Owner' : 'Member'}
                          {member.role === 'owner' && member.user_id === CURRENT_USER_ID && " (You)"}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={{ color: "#666", fontStyle: "italic" }}>No members yet</p>
                )}
              </div>
            )}
          </div>

          {/* Invite modal (private groups, owner only) */}
          {inviteModalOpen && (
            <div style={modalOverlay} onClick={() => !inviting && setInviteModalOpen(false)}>
              <div style={modalCard} onClick={(e) => e.stopPropagation()}>
                <h3 style={{ marginTop: 0, marginBottom: 16 }}>Invite by email</h3>
                <p style={{ color: "#666", fontSize: 14, marginBottom: 16 }}>
                  Enter the email address of the person you want to invite to this group.
                </p>
                <form onSubmit={handleSendInvite}>
                  <input
                    type="email"
                    placeholder="Email address"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    disabled={inviting}
                    style={inviteEmailInput}
                    autoFocus
                  />
                  {inviteError && (
                    <p style={{ color: "#b00020", fontSize: 14, marginBottom: 8 }}>{inviteError}</p>
                  )}
                  <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
                    <button
                      type="button"
                      style={modalCancelBtn}
                      onClick={() => !inviting && setInviteModalOpen(false)}
                      disabled={inviting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      style={inviteEmail.trim() ? modalSendBtn : modalSendBtnDisabled}
                      disabled={!inviteEmail.trim() || inviting}
                    >
                      {inviting ? "Sending…" : "Send Invite"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Posts Preview */}
          <div style={section}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <h3 style={{ ...sectionTitle, margin: 0 }}>Posts</h3>
              <button
                type="button"
                style={btn("primary")}
                onClick={() => setCreatePostOpen(true)}
              >
                Create Post
              </button>
            </div>
            {loadingPosts ? (
              <p>Loading posts...</p>
            ) : postsError ? (
              <p style={{ color: "#b00020" }}>{postsError}</p>
            ) : groupPosts.length === 0 ? (
              <p style={{ color: "#666", fontStyle: "italic" }}>
                No posts in this group yet.
              </p>
            ) : (
              <div style={postsList}>
                {groupPosts.map((post) => (
                  <FeedPostCard
                    key={post.post_id}
                    post={post}
                    onLikePost={handleLikePost}
                    onTagFilter={() => {}}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <CreatePostForm
        open={createPostOpen}
        onClose={() => setCreatePostOpen(false)}
        onSubmit={handleCreatePost}
        hideGroupSelect
        fixedGroupId={Number(groupId)}
      />
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

function initials(name) {
  if (!name) return "👤";
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

const categoryDisplay = {
  display: "flex",
  flexWrap: "wrap",
  gap: 10,
};

const categoryPill = {
  backgroundColor: "#f0f0f0",
  color: "#111",
  padding: "8px 20px",
  borderRadius: 30,
  fontSize: 14,
  fontWeight: 600,
  border: "1px solid #ddd",
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
  cursor: "pointer",
  transition: "background-color 0.2s",
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

const inviteButton = {
  padding: "8px 16px",
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  background: "#111",
  color: "#fff",
  border: "1px solid #111",
};

// Reuse same feedback styles as GroupsPage
const feedbackOverlay = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  pointerEvents: "none",
  zIndex: 1300,
};

const feedbackCard = {
  pointerEvents: "auto",
  marginTop: 40,
  background: "#fff",
  borderRadius: 12,
  boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
  padding: "16px 20px",
  minWidth: 280,
  maxWidth: 420,
  border: "1px solid #D6DFE2",
  position: "relative",
};

const feedbackClose = {
  position: "absolute",
  top: 8,
  right: 10,
  border: "none",
  background: "transparent",
  cursor: "pointer",
  fontSize: 18,
  fontWeight: 700,
  color: "#666",
};

const feedbackText = {
  fontSize: 14,
  color: "#17292B",
  paddingRight: 16,
};

const modalOverlay = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};

const modalCard = {
  background: "#fff",
  borderRadius: 12,
  padding: 24,
  maxWidth: 400,
  width: "90%",
  boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
};

const privateGroupModalCard = {
  background: "#fff",
  borderRadius: 16,
  padding: 28,
  maxWidth: 380,
  width: "90%",
  boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
  border: "1px solid #D6DFE2",
};

const privateGroupModalText = {
  margin: "0 0 24px 0",
  fontSize: 18,
  fontWeight: 600,
  color: "#17292B",
};

const privateGroupModalActions = {
  display: "flex",
  gap: 12,
  justifyContent: "flex-end",
};

const privateGroupModalRequestBtn = {
  padding: "12px 24px",
  borderRadius: 30,
  border: "none",
  background: "#111",
  color: "#fff",
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
};

const privateGroupModalCancelBtn = {
  padding: "12px 24px",
  borderRadius: 30,
  border: "2px solid #D6DFE2",
  background: "transparent",
  color: "#17292B",
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
};

const inviteEmailInput = {
  width: "100%",
  padding: "12px 14px",
  fontSize: 16,
  border: "1px solid #ddd",
  borderRadius: 8,
  outline: "none",
  boxSizing: "border-box",
};

const modalCancelBtn = {
  padding: "10px 18px",
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  background: "#fff",
  color: "#111",
  border: "1px solid #bbb",
};

const modalSendBtn = {
  padding: "10px 18px",
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  background: "#111",
  color: "#fff",
  border: "1px solid #111",
};

const modalSendBtnDisabled = {
  padding: "10px 18px",
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 600,
  cursor: "not-allowed",
  background: "#ccc",
  color: "#666",
  border: "1px solid #ccc",
};