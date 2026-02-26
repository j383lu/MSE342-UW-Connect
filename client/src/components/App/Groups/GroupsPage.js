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

  // Hardcoded user ID for now (should come from auth context later)
  const CURRENT_USER_ID = 1;

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
      
      // Fetch fresh memberships - ONLY from Group_Members table
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
        }
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
        method: 'DELETE'
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
      <div style={{ maxWidth: 950, margin: "0 auto", padding: 16 }}>
        <p>Loading groups...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 950, margin: "0 auto", padding: 16 }}>
      {/* Header */}
      <div style={headerRow}>
        <h1 style={{ margin: 0 }}>Groups</h1>

        <button style={primaryBtn} onClick={() => navigate("/groups/new")}>
          + Create Group
        </button>
      </div>

      {error && (
        <div style={errorBanner}>
          {error}
        </div>
      )}

      {/* Owned Groups */}
      <section style={{ marginTop: 18 }}>
        <h2 style={{ marginBottom: 10 }}>Owned Groups</h2>

        {ownedGroups.length === 0 ? (
          <p style={{ color: "#444" }}>
            You haven't created any groups yet. Click "Create Group" to make one!
          </p>
        ) : (
          ownedGroups.map((g) => {
            const isAlsoMember = memberships.includes(Number(g.group_id));
            return (
              <div key={g.group_id} style={ownedRow}>
                <div
                  style={{ flex: 1, cursor: "pointer" }}
                  onClick={() => navigate(`/groups/${g.group_id}`)}
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
                        background: !g.is_private ? "#e9f7ef" : "#fdecea",
                      }}
                    >
                      {!g.is_private ? "Open" : "Private"}
                    </span>
                    {g.max_members && (
                      <span style={pill}>
                        Max {g.max_members} members
                      </span>
                    )}
                    <span style={{...pill, background: "#e3f2fd", color: "#1976d2"}}>
                      Owner
                    </span>
                    {isAlsoMember && (
                      <span style={{...pill, background: "#e3f2fd", color: "#1976d2"}}>
                        Member
                      </span>
                    )}
                  </div>
                </div>

                <button
                  style={secondaryBtn}
                  onClick={() => navigate(`/groups/${g.group_id}/edit`)}
                >
                  Edit Group
                </button>
              </div>
            );
          })
        )}
      </section>

      {/* My Groups */}
      <section style={{ marginTop: 26 }}>
        <h2 style={{ marginBottom: 10 }}>My Groups</h2>

        {myGroups.length === 0 ? (
          <p style={{ color: "#444" }}>
            You're not in any groups yet. Join one below!
          </p>
        ) : (
          myGroups.map((g) => (
            <GroupCardRow
              key={g.group_id}
              group={g}
              isMember={true}
              onJoin={handleJoin}
              onLeave={handleLeave}
              onOpen={() => navigate(`/groups/${g.group_id}`)}
            />
          ))
        )}
      </section>

      {/* Discover Groups */}
      <section style={{ marginTop: 26 }}>
        <h2 style={{ marginBottom: 10 }}>Discover Groups</h2>

        <div style={toolbar}>
          {/* Category Filter Dropdown */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <label style={{ fontWeight: 600, color: "#444" }}>Category:</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={selectInput}
              disabled={loadingTags}
            >
              <option value="Any">Any</option>
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

        <div style={{ marginTop: 12 }}>
          {discoverGroups.length === 0 ? (
            <p style={{ color: "#444" }}>No groups match your filter/search.</p>
          ) : (
            discoverGroups.map((g) => {
              const isMember = memberships.includes(Number(g.group_id));
              return (
                <GroupCardRow
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
      </section>
    </div>
  );
}

/** Clickable "card row". Join/Leave buttons don't navigate. */
function GroupCardRow({ group, isMember, onJoin, onLeave, onOpen }) {
  console.log(`Rendering GroupCardRow for ${group.name} (ID: ${group.group_id}), isMember: ${isMember}`);
  
  // Check if group is full
  const isFull = group.max_members && group.member_count >= group.max_members;
  
  return (
    <div onClick={onOpen} style={card}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0 }}>{group.name}</h3>
          <p style={{ margin: "6px 0 0", color: "#444" }}>{group.description}</p>

          <div style={metaRow}>
            <span style={pill}>{group.category}</span>
            <span
              style={{
                ...pill,
                background: !group.is_private ? "#e9f7ef" : "#fdecea",
              }}
            >
              {!group.is_private ? "Open" : "Private"}
            </span>
            {group.member_count !== undefined && (
              <span style={pill}>
                👥 {group.member_count} {group.max_members ? `/ ${group.max_members}` : 'members'}
              </span>
            )}
            {isMember && (
              <span style={{...pill, background: "#e3f2fd", color: "#1976d2"}}>
                ✅ Joined
              </span>
            )}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start" }}>
          {isMember ? (
            <button
              style={secondaryBtn}
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
              style={primaryBtn}
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
  marginBottom: 16,
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
  backgroundColor: "#fff",
};

const card = {
  border: "1px solid #ddd",
  borderRadius: 12,
  padding: 14,
  marginBottom: 12,
  cursor: "pointer",
  backgroundColor: "#fff",
  transition: "box-shadow 0.2s",
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
  color: "#333",
};

const searchInput = {
  minWidth: 240,
  flex: "1 1 260px",
  padding: 10,
  borderRadius: 10,
  border: "1px solid #ccc",
  outline: "none",
  fontSize: 14,
};

const selectInput = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #ccc",
  background: "#fff",
  fontSize: 14,
  minWidth: 150,
  cursor: "pointer",
};

const errorBanner = {
  backgroundColor: "#ffebee",
  color: "#b00020",
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #ffcdd2",
  fontSize: 13,
};

const primaryBtn = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #111",
  background: "#111",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
  fontSize: 14,
};

const secondaryBtn = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #bbb",
  background: "#fff",
  color: "#111",
  fontWeight: 800,
  cursor: "pointer",
  fontSize: 14,
};