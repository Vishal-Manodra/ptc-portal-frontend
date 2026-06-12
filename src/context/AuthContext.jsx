// src/context/AuthContext.jsx
// React Context = global state that any component can read.
// Without this, we'd have to pass "user" and "token" as props
// through every single component — very messy.
// With context, any component just calls useAuth() and gets the current user.

import { createContext, useContext, useState, useEffect } from "react";
import { loginUser, loginWithGoogle } from "../api";

// Create the context object
const AuthContext = createContext(null);

// AuthProvider wraps the entire app (see App.jsx)
// It holds the logged-in user state and provides login/logout functions
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  // loading = true while we check if there's already a saved login

  // On app start, check if user was already logged in (token in localStorage)
  // localStorage persists across page refreshes — like a cookie but simpler
  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const saveSession = (data) => {
    const sessionUser = {
      id: data.user_id,
      name: data.name,
      role: data.role,
    };

    setToken(data.access_token);
    setUser(sessionUser);

    localStorage.setItem("token", data.access_token);
    localStorage.setItem("user", JSON.stringify(sessionUser));

    return data;
  };

  const login = async (email, password) => {
    const data = await loginUser(email, password);
    return saveSession(data);
  };

  const googleLogin = async (credential) => {
    const data = await loginWithGoogle(credential);
    return saveSession(data);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    // Redirect to login page
    window.location.href = "/login";
  };

  // isAdmin / isEmployee / isClient = helper booleans any component can use
  const isAdmin = user?.role === "admin";
  const isEmployee = user?.role === "employee";
  const isClient = user?.role === "client";

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        googleLogin,
        logout,
        loading,
        isAdmin,
        isEmployee,
        isClient,
      }}
    >
      {/* Don't render anything until we know if user is logged in */}
      {!loading && children}
    </AuthContext.Provider>
  );
}

// Custom hook — components call useAuth() instead of useContext(AuthContext)
// Much cleaner: const { user, logout } = useAuth()
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
