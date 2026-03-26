import { getAuth } from "firebase/auth";

const apiRequest = async (url, options = {}) => {
  let user = null;

  try {
    const auth = getAuth();
    user = auth.currentUser;
  } catch (error) {
    // Some tests render components without initializing Firebase.
    user = null;
  }
  
  // 1. Get the token automatically
  const token = user ? await user.getIdToken() : null;

  // 2. Set up headers
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }), // Only add if token exists
    ...options.headers,
  };

  // 3. Perform the fetch
  const response = await fetch(url, { ...options, headers });

  // 4. Global Error Handling
  if (response.status === 401) {
    console.error("Unauthorized! Redirecting...");
    // Optional: window.location.href = '/login';
  }

  return response;
};

export default apiRequest;
