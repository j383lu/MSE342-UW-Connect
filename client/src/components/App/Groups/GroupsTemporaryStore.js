// client/src/components/App/GroupsTemporaryStore.js

const GROUPS_KEY = "groups_v1";
const MEMBERSHIPS_KEY = "memberships_v1";

// fake "logged in user"
export const CURRENT_USER_ID = "u_demo";

const seedGroups = [
  {
    id: "g1",
    name: "MSE 342 Study Group",
    description: "Weekly assignments + exam prep.",
    category: "Academic",
    isOpen: true,
    ownerId: "u_demo", // owned by you
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 3,
  },
  {
    id: "g2",
    name: "UW Badminton Crew",
    description: "Drop-in games + intramurals.",
    category: "Intramural",
    isOpen: true,
    ownerId: "u_other",
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
  },
  {
    id: "g3",
    name: "Coffee Chats @ DC",
    description: "Meet new people and hang out.",
    category: "Social",
    isOpen: true,
    ownerId: "u_other",
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 1,
  },
];

function safeParse(raw, fallback) {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function read(key, fallback) {
  return safeParse(localStorage.getItem(key), fallback);
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function initStore() {
  if (!localStorage.getItem(GROUPS_KEY)) write(GROUPS_KEY, seedGroups);
  if (!localStorage.getItem(MEMBERSHIPS_KEY)) write(MEMBERSHIPS_KEY, []);
}

export function getGroups() {
  return read(GROUPS_KEY, []);
}

export function getGroupById(groupId) {
  return getGroups().find((g) => g.id === groupId) || null;
}

export function getMemberships() {
  return read(MEMBERSHIPS_KEY, []);
}

export function createGroup({ name, description, category, isOpen }) {
  const groups = getGroups();
  const newGroup = {
    id: "g_" + Math.random().toString(36).slice(2, 9),
    name: name.trim(),
    description: description.trim(),
    category,
    isOpen,
    ownerId: CURRENT_USER_ID,
    createdAt: Date.now(),
  };
  write(GROUPS_KEY, [newGroup, ...groups]);
  return newGroup;
}

export function updateGroup(groupId, patch) {
  const groups = getGroups();
  const updated = groups.map((g) => (g.id === groupId ? { ...g, ...patch } : g));
  write(GROUPS_KEY, updated);
  return updated.find((g) => g.id === groupId) || null;
}

export function joinGroup(groupId) {
  const memberships = getMemberships();
  if (memberships.includes(groupId)) return memberships;
  const updated = [...memberships, groupId];
  write(MEMBERSHIPS_KEY, updated);
  return updated;
}

export function leaveGroup(groupId) {
  const memberships = getMemberships();
  const updated = memberships.filter((id) => id !== groupId);
  write(MEMBERSHIPS_KEY, updated);
  return updated;
}