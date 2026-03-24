// client/src/components/App/GroupsPage.js

import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import apiRequest from "../../../utils/api";
import PostCard from "../../Post/PostCard";

export default function GroupsPage() {
  const navigate = useNavigate();

  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [memberships, setMemberships] = useState([]);
  const [invites, setInvites] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]);
  const [feedback, setFeedback] = useState("");
  const [filter, setFilter] = useState("Any");
  const [search, setSearch] = useState("");

  // Active tab: 'general' | 'discover' | 'my' | 'owned'
  const [activeTab, setActiveTab] = useState("general");
  
  // Posts for General tab (all posts across all groups)
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  
  // Tags from database
  const [tagOptions, setTagOptions] = useState([]);
  const [loadingTags, setLoadingTags] = useState(true);
  const [tagsError, setTagsError] = useState("");

  // Current app user id (set after login and stored in localStorage)
  const storedUserIdRaw = localStorage.getItem('currentUserId');
  const CURRENT_USER_ID = storedUserIdRaw ? Number(storedUserIdRaw) : null;

  // Add ref to prevent multiple simultaneous operations
  const isLeaving = useRef(false);
  const isJoining = useRef(false);

  // Load tags on component mount
  useEffect(() => {
    loadTags();
  }, []);

  // Load ALL groups on mount
  useEffect(() => {
    loadAllGroups();
  }, []);

  // Add this useEffect to refresh data when the page is focused/visited
  useEffect(() => {
    // Load fresh data whenever the component mounts or gains focus
    loadAllGroups();

    // Also refresh when the page is shown (user navigates back)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log("Page became visible, refreshing groups data");
        loadAllGroups();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []); 

  async function loadTags() {
    try {
      setLoadingTags(true);
      const res = await apiRequest('/api/tags');
      
      if (!res.ok) {
        throw new Error('Failed to load tags');
      }

      const data = await res.json();
      setTagOptions(data);
    } catch (err) {
      console.error("Error loading tags:", err);
      setTagsError("Could not load categories");
      // Fallback to default tags
      setTagOptions([
        { tag_id: 1, tag_name: "Academic" },
        { tag_id: 2, tag_name: "Intramural" },
        { tag_id: 3, tag_name: "Social" }
      ]);
    } finally {
      setLoadingTags(false);
    }
  }

  // Function to fetch fresh data
  async function fetchFreshData() {
    try {
      // Fetch fresh groups
      const groupsRes = await apiRequest('/api/groups');
      if (!groupsRes.ok) {
        throw new Error('Failed to fetch groups');
      }
      const freshGroups = await groupsRes.json();
      console.log("Fresh groups data:", freshGroups);
      setGroups(freshGroups);
      
      // If we don't know the current user yet, skip membership fetch
      if (!CURRENT_USER_ID) {
        console.warn("No CURRENT_USER_ID set; skipping membership fetch");
        setMemberships([]);
        return;
      }

      // Fetch fresh memberships - ONLY from Group_Members table for this user
      const membershipsRes = await apiRequest(`/api/users/${CURRENT_USER_ID}/groups/member`);
      let memberIds = [];
      
      if (membershipsRes.ok) {
        const membershipsData = await membershipsRes.json();
        console.log("Fresh memberships data from Group_Members:", membershipsData);
        memberIds = membershipsData.map(g => Number(g.group_id));
      }
      
      console.log("Final member IDs (from Group_Members only):", memberIds);
      setMemberships(memberIds);

      // Fetch pending group invites for this user
      const invitesRes = await apiRequest(`/api/users/${CURRENT_USER_ID}/invites`);
      if (invitesRes.ok) {
        const invitesData = await invitesRes.json();
        setInvites(invitesData);
      } else {
        setInvites([]);
      }

      // Fetch pending join requests for groups the user owns
      const joinRequestsRes = await apiRequest(`/api/users/${CURRENT_USER_ID}/join-requests-as-owner`);
      if (joinRequestsRes.ok) {
        const joinRequestsData = await joinRequestsRes.json();
        setJoinRequests(joinRequestsData || []);
      } else {
        setJoinRequests([]);
      }
      
    } catch (err) {
      console.error("Error fetching fresh data:", err);
      throw err;
    }
  }

  async function loadAllGroups() {
    try {
      setLoading(true);
      setError("");
      await fetchFreshData();
    } catch (err) {
      console.error("Error loading groups:", err);
      setError("Failed to load groups");
    } finally {
      setLoading(false);
    }
  }

  async function loadPosts() {
    try {
      setLoadingPosts(true);
      const res = await apiRequest('/api/posts');
      if (res.ok) {
        const data = await res.json();
        setPosts(Array.isArray(data) ? data : []);
      } else {
        setPosts([]);
      }
    } catch (err) {
      console.error("Error loading posts:", err);
      setPosts([]);
    } finally {
      setLoadingPosts(false);
    }
  }

  // Load posts when switching to General tab
  useEffect(() => {
    if (activeTab === "general") {
      loadPosts();
    }
  }, [activeTab]);

  async function handleJoin(groupId) {
    // Prevent multiple simultaneous join attempts
    if (isJoining.current) return;
    
    try {
      isJoining.current = true;
      console.log("========== JOIN ATTEMPT ==========");
      console.log("Joining group ID:", groupId);
      
      const res = await apiRequest(`/api/groups/${groupId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: CURRENT_USER_ID
        })
      });

      console.log("Join response status:", res.status);
      const responseData = await res.json();
      console.log("Join response data:", responseData);

      if (!res.ok) {
        if (responseData.error === 'Already a member of this group') {
          console.log("Already a member, refreshing data...");
          await fetchFreshData();
          return;
        }
        throw new Error(responseData.error || 'Failed to join group');
      }

      console.log("Successfully joined group, refreshing data...");
      
      await fetchFreshData();
      
    } catch (err) {
      console.error("Error in handleJoin:", err);
      alert(err.message);
    } finally {
      setTimeout(() => {
        isJoining.current = false;
      }, 1000);
    }
  }

  async function handleLeave(groupId) {
    // Prevent multiple simultaneous leave attempts
    if (isLeaving.current) return;
    
    try {
      isLeaving.current = true;
      console.log("========== LEAVE ATTEMPT ==========");
      console.log("Leaving group ID:", groupId);
      
      const res = await apiRequest(`/api/groups/${groupId}/leave`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: CURRENT_USER_ID
        })
      });

      console.log("Leave response status:", res.status);
      const responseData = await res.json();
      console.log("Leave response data:", responseData);
      
      if (!res.ok) {
        // If the server says we're not a member, update UI to reflect that
        if (responseData.error === 'Not a member of this group') {
          console.log("Server says not a member, updating UI to match");
          await fetchFreshData();
          return;
        }
        
        alert(responseData.error || 'Failed to leave group');
        return;
      }

      console.log("✅ Successfully left group");
      
      await fetchFreshData();
      
    } catch (err) {
      console.error("Error in handleLeave:", err);
      alert(err.message);
    } finally {
      setTimeout(() => {
        isLeaving.current = false;
      }, 1000);
    }
  }

  // Helper: apply filter and search to a group (client-side filtering)
  const matchesFilterAndSearch = (g) => {
    if (filter !== "Any" && g.category !== filter) return false;
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      return (
        g.name.toLowerCase().includes(searchLower) ||
        (g.description && g.description.toLowerCase().includes(searchLower))
      );
    }
    return true;
  };

  const ownedGroups = useMemo(() => {
    return groups
      .filter((g) => Number(g.creator_id) === CURRENT_USER_ID)
      .filter(matchesFilterAndSearch);
  }, [groups, filter, search]);

  const myGroups = useMemo(() => {
    return groups
      .filter((g) => memberships.includes(Number(g.group_id)))
      .filter(matchesFilterAndSearch);
  }, [groups, memberships, filter, search]);

  // Discover groups: groups user is NOT in but are available
  const discoverGroups = useMemo(() => {
    return groups
      .filter((g) => !memberships.includes(Number(g.group_id)))
      .filter(matchesFilterAndSearch);
  }, [groups, memberships, filter, search]);

  // General tab: all posts across all groups, filtered by search (group name) and category
  const generalPosts = useMemo(() => {
    return posts.filter((p) => {
      if (!p.group_id) return false;
      const group = groups.find((g) => Number(g.group_id) === Number(p.group_id));
      if (filter !== "Any" && group && group.category !== filter) return false;
      if (search.trim()) {
        const searchLower = search.toLowerCase();
        const groupName = (p.group_name || group?.name || "").toLowerCase();
        return groupName.includes(searchLower);
      }
      return true;
    });
  }, [posts, groups, filter, search]);

  async function handleRequestAccess(groupId) {
    try {
      const res = await apiRequest(`/api/groups/${groupId}/request-access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setFeedback("Your request has been sent to the group owner.");
      } else {
        alert(data.error || "Failed to send request");
      }
    } catch (err) {
      console.error("Error requesting access:", err);
      alert("Failed to send request");
    }
  }

  async function handleRespondToJoinRequest(requestId, action) {
    const req = joinRequests.find((r) => r.request_id === requestId);
    const name = req?.requester_name || "User";
    const groupName = req?.group_name || "group";
    try {
      const res = await apiRequest(`/api/join-requests/${requestId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ownerId: CURRENT_USER_ID }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "Failed to respond");
        return;
      }
      setJoinRequests((prev) => prev.filter((r) => r.request_id !== requestId));
      await fetchFreshData();
      setFeedback(
        action === "accept"
          ? `You have accepted ${name}'s request to join "${groupName}"`
          : `You have declined ${name}'s request to join "${groupName}"`
      );
    } catch (err) {
      console.error("Error responding to join request:", err);
      alert("Failed to respond");
    }
  }

  async function handleLikePost(postId) {
    try {
      const res = await apiRequest(`/api/posts/${postId}/like`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return;

      setPosts((prev) =>
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

  return (
    <div style={pageContainer}>
      {/* Simple feedback popup */}
      {feedback && (
        <div style={feedbackOverlay}>
          <div style={feedbackCard}>
            <button
              type="button"
              onClick={() => setFeedback("")}
              style={feedbackClose}
              aria-label="Close"
            >
              ×
            </button>
            <div style={feedbackText}>{feedback}</div>
          </div>
        </div>
      )}

      {loading && groups.length === 0 && (
        <div>
          <p>Loading groups...</p>
        </div>
      )}
      {/* Header with frame */}
      <div style={headerFrame}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h1 style={pageTitle}>Groups</h1>
          {CURRENT_USER_ID && (invites.length > 0 || joinRequests.length > 0) && (
            <div style={notifBadge}>
              {invites.length + joinRequests.length}
            </div>
          )}
        </div>
        <button style={createBtn} onClick={() => navigate("/groups/new")}>
          + Create Group
        </button>
      </div>

      {/* Global invitation banner area, directly under Groups header */}
      {CURRENT_USER_ID && invites.length > 0 && (
        <div style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          {invites.map((invite) => (
            <div key={invite.invite_id} style={inviteBanner}>
              <span>
                <strong>{invite.inviter_name || "Someone"}</strong> invited you to join{" "}
                <strong>{invite.group_name}</strong>
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  style={inviteAcceptBtn}
                  onClick={async () => {
                    if (!CURRENT_USER_ID) return;
                    try {
                      const res = await apiRequest(`/api/invites/${invite.invite_id}/respond`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "accept", userId: CURRENT_USER_ID })
                      });
                      await res.json().catch(() => ({}));
                      // Optimistically remove this invite from UI
                      setInvites((prev) => prev.filter(i => i.invite_id !== invite.invite_id));
                      await fetchFreshData();
                      setFeedback(`You have accepted the invitation to join group "${invite.group_name}"`);
                    } catch (err) {
                      console.error("Error accepting invite:", err);
                      alert("Failed to accept invite");
                    }
                  }}
                >
                  Accept
                </button>
                <button
                  style={inviteDeclineBtn}
                  onClick={async () => {
                    if (!CURRENT_USER_ID) return;
                    try {
                      const res = await apiRequest(`/api/invites/${invite.invite_id}/respond`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "decline", userId: CURRENT_USER_ID })
                      });
                      const data = await res.json().catch(() => ({}));
                      if (!res.ok) {
                        console.error("Decline invite failed:", data);
                        alert(data.error || "Failed to decline invite");
                        return;
                      }
                      // Refresh from server so declined invite is no longer returned
                      await fetchFreshData();
                      setFeedback(`You have declined the invitation to join group "${invite.group_name}"`);
                    } catch (err) {
                      console.error("Error declining invite:", err);
                      alert("Failed to decline invite");
                    }
                  }}
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Join requests banner for group owners */}
      {CURRENT_USER_ID && joinRequests.length > 0 && (
        <div style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          {joinRequests.map((req) => (
            <div key={req.request_id} style={joinRequestBanner}>
              <span>
                <strong>{req.requester_name || "Someone"}</strong> requested to join group{" "}
                <strong>{req.group_name}</strong>
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  style={inviteAcceptBtn}
                  onClick={() => handleRespondToJoinRequest(req.request_id, "accept")}
                >
                  Accept
                </button>
                <button
                  style={inviteDeclineBtn}
                  onClick={() => handleRespondToJoinRequest(req.request_id, "decline")}
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div style={errorBanner}>
          {error}
        </div>
      )}

      {/* Search and filter - between header and tabs */}
      <div style={searchFilterBar}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by group name..."
          style={searchInput}
        />
        <div style={filterContainer}>
          <label style={filterLabel}>Category:</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={selectInput}
            disabled={loadingTags}
          >
            <option value="Any">All Categories</option>
            {tagOptions.map((tag) => (
              <option key={tag.tag_id} value={tag.tag_name}>
                {tag.tag_name}
              </option>
            ))}
          </select>
        </div>
      </div>
      {tagsError && (
        <div style={{ ...errorBanner, marginTop: 8, marginBottom: 8 }}>
          {tagsError}
        </div>
      )}

      {/* Tab Navigation Bar */}
      <div style={tabNavBar}>
        <button
          style={activeTab === "general" ? tabButtonActive : tabButton}
          onClick={() => setActiveTab("general")}
        >
          General
        </button>
        <button
          style={activeTab === "discover" ? tabButtonActive : tabButton}
          onClick={() => setActiveTab("discover")}
        >
          Discover Groups
        </button>
        <button
          style={activeTab === "my" ? tabButtonActive : tabButton}
          onClick={() => setActiveTab("my")}
        >
          My Groups
        </button>
        <button
          style={activeTab === "owned" ? tabButtonActive : tabButton}
          onClick={() => setActiveTab("owned")}
        >
          Owned Groups
        </button>
      </div>

      {/* Tab Content - single content area below nav */}
      <div style={sectionFrame}>
        {activeTab === "general" && (
          <div style={postsContainer}>
            {loadingPosts ? (
              <p style={emptyMessage}>Loading posts...</p>
            ) : generalPosts.length === 0 ? (
              <p style={emptyMessage}>
                {(search.trim() || filter !== "Any")
                  ? "No posts match your search/filter."
                  : "No posts in any groups yet."}
              </p>
            ) : (
              generalPosts.map((post) => (
                <PostCard
                  key={post.post_id}
                  post={post}
                  onLikePost={handleLikePost}
                  onTagFilter={() => {}}
                />
              ))
            )}
          </div>
        )}

        {activeTab === "discover" && (
            <div style={cardsContainer}>
              {discoverGroups.length === 0 ? (
                <p style={emptyMessage}>
                  {(search.trim() || filter !== "Any")
                    ? "No groups match your search/filter."
                    : "No groups available to discover. You may already be in all groups."}
                </p>
              ) : (
                discoverGroups.map((g) => {
                  const isMember = memberships.includes(Number(g.group_id));
                  return (
                    <GroupCard
                      key={g.group_id}
                      group={g}
                      isMember={isMember}
                      currentUserId={CURRENT_USER_ID}
                      onJoin={handleJoin}
                      onLeave={handleLeave}
                      onOpen={() => navigate(`/groups/${g.group_id}`)}
                      onRequestAccess={handleRequestAccess}
                    />
                  );
                })
              )}
            </div>
        )}

        {activeTab === "my" && (
          <div style={cardsContainer}>
            {myGroups.length === 0 ? (
              <p style={emptyMessage}>
                {(search.trim() || filter !== "Any")
                  ? "No groups match your search/filter."
                  : "You're not in any groups yet. Switch to Discover Groups to join one!"}
              </p>
            ) : (
              myGroups.map((g) => (
                <GroupCard
                  key={g.group_id}
                  group={g}
                  isMember={true}
                  currentUserId={CURRENT_USER_ID}
                  onJoin={handleJoin}
                  onLeave={handleLeave}
                  onOpen={() => navigate(`/groups/${g.group_id}`)}
                  onRequestAccess={handleRequestAccess}
                />
              ))
            )}
          </div>
        )}

        {activeTab === "owned" && (
          <div style={cardsContainer}>
            {ownedGroups.length === 0 ? (
              <p style={emptyMessage}>
                {(search.trim() || filter !== "Any")
                  ? "No groups match your search/filter."
                  : "You haven't created any groups yet. Click \"Create Group\" to make one!"}
              </p>
            ) : (
              ownedGroups.map((g) => {
                const isAlsoMember = memberships.includes(Number(g.group_id));
                return (
                  <div
                    key={g.group_id}
                    style={card}
                    onClick={() => navigate(`/groups/${g.group_id}`)}
                  >
                    <div style={cardHeader}>
                      <h3 style={cardTitle}>{g.name}</h3>
                      <button
                        style={outlineBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/groups/${g.group_id}/edit`);
                        }}
                      >
                        Edit
                      </button>
                    </div>
                    <p style={cardDescription}>
                      {g.description}
                    </p>
                    <div style={tagsContainer}>
                      <span style={getPillStyle(g.category)}>{g.category}</span>
                      <span style={getPillStyle(g.is_private ? 'private' : 'open')}>
                        {!g.is_private ? "Open" : "Private"}
                      </span>
                      {g.max_members && (
                        <span style={greyPill}>Max {g.max_members}</span>
                      )}
                      <span style={{...pill, background: "#fff3e0", color: "#ed6c02"}}>
                        Owner
                      </span>
                      {isAlsoMember && (
                        <span style={{...pill, background: "#e3f2fd", color: "#1976d2"}}>
                          Member
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Group Card Component */
function GroupCard({ group, isMember, currentUserId, onJoin, onLeave, onOpen, onRequestAccess }) {
  const [privateModalOpen, setPrivateModalOpen] = React.useState(false);
  
  const isOwner = currentUserId && Number(group.creator_id) === currentUserId;
  // Check if group is full
  const isFull = group.max_members && group.member_count >= group.max_members;
  
  // For private groups, non-members see Join but get invite-only popup
  const isPrivateInviteOnly = group.is_private && !isMember && !isOwner;

  function handleJoinClick(e) {
    e.stopPropagation();
    if (isPrivateInviteOnly) {
      setPrivateModalOpen(true);
    } else {
      onJoin(group.group_id);
    }
  }

  return (
    <div onClick={onOpen} style={card}>
      <div style={cardHeader}>
        <h3 style={cardTitle}>{group.name}</h3>
        <div style={buttonWrapper}>
          {isMember ? (
            <button
              style={outlineBtn}
              onClick={(e) => {
                e.stopPropagation();
                onLeave(group.group_id);
              }}
            >
              Leave
            </button>
          ) : (
            <button
              style={solidBtn}
              disabled={isFull}
              onClick={handleJoinClick}
              title={
                group.is_private 
                  ? (isOwner
                      ? "As the owner, you can join your private group"
                      : "Private group - join by invitation only")
                  : isFull 
                    ? "Group is full" 
                    : ""
              }
            >
              Join
            </button>
          )}
        </div>
      </div>

      {/* Private group invite-only modal */}
      {privateModalOpen && (
        <div
          style={modalOverlay}
          onClick={(e) => {
            e.stopPropagation();
            setPrivateModalOpen(false);
          }}
        >
          <div style={privateModalCard} onClick={(e) => e.stopPropagation()}>
            <p style={privateModalText}>This group is Invite-only.</p>
            <div style={privateModalActions}>
              <button
                style={privateModalRequestBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  setPrivateModalOpen(false);
                  onRequestAccess?.(group.group_id);
                }}
              >
                Request Access
              </button>
              <button
                style={privateModalCancelBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  setPrivateModalOpen(false);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      <p style={cardDescription}>{group.description}</p>
      <div style={tagsContainer}>
        <span style={getPillStyle(group.category)}>{group.category}</span>
        <span style={getPillStyle(group.is_private ? 'private' : 'open')}>
          {!group.is_private ? "Open" : "Private"}
        </span>
        {group.member_count !== undefined && (
          <span style={greyPill}>
            {group.member_count} {group.max_members ? `/ ${group.max_members}` : 'members'}
          </span>
        )}
        {isMember && (
          <span style={{...pill, background: "#e3f2fd", color: "#1976d2"}}>
            ✅ Joined
          </span>
        )}
      </div>
    </div>
  );
}

// Helper function to get pill style based on category/type
function getPillStyle(type) {
  const baseStyle = { ...pill };
  
  switch(type?.toLowerCase()) {
    case 'academic':
      return { ...baseStyle, background: "#e3f2fd", color: "#1976d2" };
    case 'social':
      return { ...baseStyle, background: "#f3e5f5", color: "#7b1fa2" };
    case 'intramural':
      return { ...baseStyle, background: "#e8f5e8", color: "#2e7d32" };
    case 'open':
      return { ...baseStyle, background: "#e9f7ef", color: "#2e7d32" };
    case 'private':
      return { ...baseStyle, background: "#fdecea", color: "#b00020" };
    default:
      return { ...baseStyle, background: "#f3f3f3", color: "#17292B" };
  }
}

/* ---------------- styles ---------------- */
const pageContainer = {
  width: "100%",
  minHeight: "100vh",
  padding: "24px 32px",
  boxSizing: "border-box",
};

const pageTitle = {
  margin: 0,
  fontSize: "2.5rem",
  fontWeight: 700,
  color: "#17292B",
};

const notifBadge = {
  minWidth: 22,
  height: 22,
  borderRadius: "999px",
  backgroundColor: "#b00020",
  color: "#fff",
  fontSize: 12,
  fontWeight: 700,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const headerFrame = {
  background: "#FFFFFF",
  padding: "20px 30px",
  borderRadius: "20px",
  border: "1px solid #D6DFE2",
  boxShadow: "0 4px 12px rgba(93,108,92,0.1)",
  borderLeft: "6px solid #5D6C5C",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  marginBottom: "24px",
  width: "100%",
  boxSizing: "border-box",
};

const searchFilterBar = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  flexWrap: "wrap",
  padding: "16px 20px",
  marginTop: "16px",
  marginBottom: "0",
  background: "#FFFFFF",
  borderRadius: "12px",
  border: "1px solid #D6DFE2",
  boxShadow: "0 2px 8px rgba(93,108,92,0.06)",
  width: "100%",
  boxSizing: "border-box",
};

const tabNavBar = {
  display: "flex",
  gap: "8px",
  marginTop: "0",
  marginBottom: "0",
  padding: "8px 0",
  borderBottom: "2px solid #D6DFE2",
  width: "100%",
};

const tabButton = {
  padding: "12px 24px",
  borderRadius: "12px 12px 0 0",
  border: "1px solid #D6DFE2",
  borderBottom: "none",
  background: "#F5F7F6",
  color: "#5D6C5C",
  fontWeight: 600,
  fontSize: "15px",
  cursor: "pointer",
  transition: "all 0.2s",
};

const tabButtonActive = {
  ...tabButton,
  background: "#FFFFFF",
  color: "#17292B",
  borderColor: "#D6DFE2",
  boxShadow: "0 -2px 8px rgba(0,0,0,0.04)",
};

const sectionFrame = {
  background: "#FFFFFF",
  borderRadius: "0 12px 24px 24px",
  padding: "24px",
  marginTop: "0",
  border: "1px solid #D6DFE2",
  borderTop: "none",
  boxShadow: "0 4px 12px rgba(93,108,92,0.08)",
  width: "100%",
  boxSizing: "border-box",
};

const postsContainer = {
  display: "flex",
  flexDirection: "column",
  gap: "16px",
  width: "100%",
};

const sectionTitle = {
  fontWeight: 700,
  fontSize: "2rem",
  marginBottom: "24px",
  color: "#5D6C5C",
  borderBottom: "3px solid #D6DFE2",
  paddingBottom: "10px",
  display: "inline-block",
};

const cardsContainer = {
  display: "flex",
  flexDirection: "column",
  gap: "16px",
  width: "100%",
};

const card = {
  border: "1px solid #D6DFE2",
  borderRadius: "16px",
  padding: "20px",
  backgroundColor: "#FDFDF6",
  boxShadow: "0px 2px 8px rgba(0,0,0,0.03)",
  transition: "all 0.2s",
  cursor: "pointer",
  width: "100%",
  boxSizing: "border-box",
};

const cardHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "12px",
  width: "100%",
  minHeight: "56px", // Increased to accommodate taller buttons
};

const cardTitle = {
  fontSize: "1.3rem",
  fontWeight: 700,
  color: "#17292B",
  margin: 0,
  flex: "1",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  lineHeight: "56px", // Match button height for vertical alignment
};

const cardDescription = {
  color: "#686967",
  fontSize: "0.95rem",
  marginBottom: "16px",
  lineHeight: 1.5,
  width: "100%",
};

const tagsContainer = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  width: "100%",
};

const pill = {
  fontSize: "12px",
  padding: "6px 14px",
  borderRadius: "30px",
  fontWeight: 600,
  border: "none",
  display: "inline-block",
};

const greyPill = {
  fontSize: "12px",
  padding: "6px 14px",
  borderRadius: "30px",
  fontWeight: 600,
  border: "none",
  display: "inline-block",
  background: "#f3f3f3",
  color: "#686967",
};

const toolbarFrame = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap",
  marginBottom: "24px",
  background: "#FDFDF6",
  padding: "16px 20px",
  borderRadius: "16px",
  border: "1px solid #D6DFE2",
  width: "100%",
  boxSizing: "border-box",
};

const filterContainer = {
  display: "flex",
  gap: "12px",
  alignItems: "center",
  flexWrap: "wrap",
};

const filterLabel = {
  fontWeight: 600,
  color: "#686967",
};

const searchInput = {
  minWidth: "260px",
  flex: "1 1 260px",
  padding: "12px 20px",
  borderRadius: "30px",
  border: "2px solid #D6DFE2",
  outline: "none",
  fontSize: "14px",
  background: "#FFFFFF",
  color: "#17292B",
  transition: "all 0.2s",
  boxSizing: "border-box",
};

const selectInput = {
  padding: "10px 16px",
  borderRadius: "30px",
  border: "2px solid #D6DFE2",
  background: "#FFFFFF",
  fontSize: "14px",
  minWidth: "150px",
  cursor: "pointer",
  color: "#17292B",
  fontWeight: 500,
  transition: "all 0.2s",
};

const errorBanner = {
  backgroundColor: "#fdecea",
  color: "#b00020",
  padding: "12px 20px",
  borderRadius: "30px",
  border: "1px solid #ffcdd2",
  fontSize: "14px",
  marginBottom: "16px",
  width: "100%",
  boxSizing: "border-box",
};

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
  backgroundColor: "#FFFFFF",
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

const inviteBanner = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "10px 14px",
  borderRadius: 999,
  backgroundColor: "#e3f2fd",
  border: "1px solid #90caf9",
  fontSize: 14,
  color: "#0d47a1",
};

const joinRequestBanner = {
  ...inviteBanner,
  backgroundColor: "#fff8e1",
  border: "1px solid #ffca28",
  color: "#e65100",
};

const inviteAcceptBtn = {
  padding: "6px 12px",
  borderRadius: 16,
  border: "none",
  backgroundColor: "#0d47a1",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
  fontSize: 13,
};

const inviteDeclineBtn = {
  padding: "6px 12px",
  borderRadius: 16,
  border: "1px solid #0d47a1",
  backgroundColor: "#fff",
  color: "#0d47a1",
  fontWeight: 700,
  cursor: "pointer",
  fontSize: 13,
};

// Private group invite-only modal
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
  zIndex: 1400,
};

const privateModalCard = {
  background: "#fff",
  borderRadius: 16,
  padding: 28,
  maxWidth: 380,
  width: "90%",
  boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
  border: "1px solid #D6DFE2",
};

const privateModalText = {
  margin: "0 0 24px 0",
  fontSize: 18,
  fontWeight: 600,
  color: "#17292B",
};

const privateModalActions = {
  display: "flex",
  gap: 12,
  justifyContent: "flex-end",
};

const privateModalRequestBtn = {
  padding: "12px 24px",
  borderRadius: 30,
  border: "none",
  background: "#17292B",
  color: "#FDFDF6",
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
};

const privateModalCancelBtn = {
  padding: "12px 24px",
  borderRadius: 30,
  border: "2px solid #D6DFE2",
  background: "transparent",
  color: "#17292B",
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
};

const emptyMessage = {
  color: "#686967",
  padding: "20px",
  textAlign: "center",
  width: "100%",
};

const createBtn = {
  padding: "14px 28px", // Increased vertical padding
  borderRadius: "30px",
  border: "none",
  background: "#17292B",
  color: "#FDFDF6",
  fontWeight: 700,
  cursor: "pointer",
  fontSize: "15px", // Slightly larger font
  transition: "all 0.2s",
  boxShadow: "0 4px 10px rgba(23,41,43,0.2)",
  minWidth: "160px",
  lineHeight: "1.2",
};

// Solid button for Join - TALLER VERTICAL HEIGHT
const solidBtn = {
  padding: "14px 28px", // Increased vertical padding from 12px to 14px
  borderRadius: "30px",
  border: "none",
  background: "#17292B",
  color: "#FDFDF6",
  fontWeight: 700,
  cursor: "pointer",
  fontSize: "15px", // Slightly larger font
  transition: "all 0.2s",
  minWidth: "100px",
  textAlign: "center",
  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  lineHeight: "1.2",
};

// Outline button for Edit and Leave - TALLER VERTICAL HEIGHT
const outlineBtn = {
  padding: "14px 28px", // Increased vertical padding from 12px to 14px
  borderRadius: "30px",
  border: "2px solid #5D6C5C",
  background: "transparent",
  color: "#17292B",
  fontWeight: 700,
  cursor: "pointer",
  fontSize: "15px", // Slightly larger font
  transition: "all 0.2s",
  minWidth: "100px",
  textAlign: "center",
  lineHeight: "1.2",
};

const buttonWrapper = {
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
  height: "56px", // Increased from 48px to 56px for taller buttons
};