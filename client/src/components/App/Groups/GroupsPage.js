// client/src/components/App/GroupsPage.js

import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

export default function GroupsPage() {
  const navigate = useNavigate();

  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [memberships, setMemberships] = useState([]);
  const [filter, setFilter] = useState("Any");
  const [search, setSearch] = useState("");
  
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
      const res = await fetch('/api/tags');
      
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
      const groupsRes = await fetch('/api/groups');
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
      const membershipsRes = await fetch(`/api/users/${CURRENT_USER_ID}/groups/member`);
      let memberIds = [];
      
      if (membershipsRes.ok) {
        const membershipsData = await membershipsRes.json();
        console.log("Fresh memberships data from Group_Members:", membershipsData);
        memberIds = membershipsData.map(g => Number(g.group_id));
      }
      
      console.log("Final member IDs (from Group_Members only):", memberIds);
      setMemberships(memberIds);
      
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

  async function handleJoin(groupId) {
    // Prevent multiple simultaneous join attempts
    if (isJoining.current) return;
    
    try {
      isJoining.current = true;
      console.log("========== JOIN ATTEMPT ==========");
      console.log("Joining group ID:", groupId);
      
      const res = await fetch(`/api/groups/${groupId}/join`, {
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
      
      const res = await fetch(`/api/groups/${groupId}/leave`, {
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

  // Refetch when filter or search changes
  useEffect(() => {
    loadAllGroups();
  }, [filter, search]);

  const ownedGroups = useMemo(() => {
    return groups.filter((g) => Number(g.creator_id) === CURRENT_USER_ID);
  }, [groups]);

  const myGroups = useMemo(() => {
    // Debug log to see what's happening
    console.log("Calculating myGroups. memberships:", memberships);
    console.log("All groups:", groups.map(g => ({ id: g.group_id, name: g.name })));
    
    const filtered = groups.filter((g) => memberships.includes(Number(g.group_id)));
    console.log("Filtered myGroups:", filtered.map(g => ({ id: g.group_id, name: g.name })));
    return filtered;
  }, [groups, memberships]);

  // Filtered discover groups based on filter and search
  const discoverGroups = useMemo(() => {
    return groups.filter((g) => {
      // Apply category filter
      if (filter !== 'Any' && g.category !== filter) {
        return false;
      }
      
      // Apply search filter
      if (search.trim()) {
        const searchLower = search.toLowerCase();
        return (
          g.name.toLowerCase().includes(searchLower) ||
          g.description.toLowerCase().includes(searchLower)
        );
      }
      
      return true;
    });
  }, [groups, filter, search]);

  if (loading && groups.length === 0) {
    return (
      <div style={pageContainer}>
        <p>Loading groups...</p>
      </div>
    );
  }

  return (
    <div style={pageContainer}>
      {/* Header with frame */}
      <div style={headerFrame}>
        <h1 style={pageTitle}>Groups</h1>
        <button style={createBtn} onClick={() => navigate("/groups/new")}>
          + Create Group
        </button>
      </div>

      {error && (
        <div style={errorBanner}>
          {error}
        </div>
      )}

      {/* Owned Groups Section with frame */}
      <div style={sectionFrame}>
        <h2 style={sectionTitle}>Owned Groups</h2>

        {ownedGroups.length === 0 ? (
          <p style={emptyMessage}>
            You haven't created any groups yet. Click "Create Group" to make one!
          </p>
        ) : (
          <div style={cardsContainer}>
            {ownedGroups.map((g) => {
              const isAlsoMember = memberships.includes(Number(g.group_id));
              return (
                <div key={g.group_id} style={card}>
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
            })}
          </div>
        )}
      </div>

      {/* My Groups Section with frame */}
      <div style={sectionFrame}>
        <h2 style={sectionTitle}>My Groups</h2>

        {myGroups.length === 0 ? (
          <p style={emptyMessage}>
            You're not in any groups yet. Join one below!
          </p>
        ) : (
          <div style={cardsContainer}>
            {myGroups.map((g) => (
              <GroupCard
                key={g.group_id}
                group={g}
                isMember={true}
                onJoin={handleJoin}
                onLeave={handleLeave}
                onOpen={() => navigate(`/groups/${g.group_id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Discover Groups Section with frame */}
      <div style={sectionFrame}>
        <h2 style={sectionTitle}>Discover Groups</h2>

        <div style={toolbarFrame}>
          {/* Category Filter Dropdown */}
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

          {/* Search Input */}
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search groups..."
            style={searchInput}
          />
        </div>

        {tagsError && (
          <div style={{ ...errorBanner, marginTop: 8, marginBottom: 8 }}>
            {tagsError}
          </div>
        )}

        <div style={cardsContainer}>
          {discoverGroups.length === 0 ? (
            <p style={emptyMessage}>No groups match your filter/search.</p>
          ) : (
            discoverGroups.map((g) => {
              const isMember = memberships.includes(Number(g.group_id));
              return (
                <GroupCard
                  key={g.group_id}
                  group={g}
                  isMember={isMember}
                  onJoin={handleJoin}
                  onLeave={handleLeave}
                  onOpen={() => navigate(`/groups/${g.group_id}`)}
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

/** Group Card Component */
function GroupCard({ group, isMember, onJoin, onLeave, onOpen }) {
  console.log(`Rendering GroupCard for ${group.name} (ID: ${group.group_id}), isMember: ${isMember}`);
  
  // Check if group is full
  const isFull = group.max_members && group.member_count >= group.max_members;
  
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
                console.log("Leave button clicked for group:", group.group_id);
                onLeave(group.group_id);
              }}
            >
              Leave
            </button>
          ) : (
            <button
              style={solidBtn}
              disabled={group.is_private || isFull}
              onClick={(e) => {
                e.stopPropagation();
                console.log("Join button clicked for group:", group.group_id);
                onJoin(group.group_id);
              }}
              title={
                group.is_private 
                  ? "Private group - join by invitation only" 
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
  maxWidth: "1000px",
  margin: "0 auto",
  padding: "20px",
  width: "100%",
  boxSizing: "border-box",
};

const pageTitle = {
  margin: 0,
  fontSize: "2.5rem",
  fontWeight: 700,
  color: "#17292B",
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

const sectionFrame = {
  background: "#FFFFFF",
  borderRadius: "24px",
  padding: "24px",
  marginTop: "32px",
  border: "1px solid #D6DFE2",
  boxShadow: "0 4px 12px rgba(93,108,92,0.08)",
  width: "100%",
  boxSizing: "border-box",
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