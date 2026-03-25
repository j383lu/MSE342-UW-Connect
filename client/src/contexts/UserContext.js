import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [dbUser, setDbUser] = useState(null); // This will hold { user_id, display_name }
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Find the MySQL ID by email
        try {
          const token = await firebaseUser.getIdToken();
          const response = await fetch(`/api/users/by-email?email=${firebaseUser.email}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await response.json();
          setDbUser(data);
        } catch (err) {
          console.error("Failed to sync MySQL user", err);
        }
      } else {
        setDbUser(null);
      }
      setLoading(false);
    });
  }, []);

  return (
    <UserContext.Provider value={{ dbUser, loading }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);