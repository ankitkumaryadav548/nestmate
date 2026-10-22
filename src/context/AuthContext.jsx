"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";

const AuthContext = createContext({
  user: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refreshUser = async () => {
    try {
      const response = await api.get("/auth/me");
      if (response.data && response.data.success && response.data.data) {
        setUser(response.data.data);
        return response.data.data;
      } else {
        setUser(null);
        return null;
      }
    } catch {
      setUser(null);
      return null;
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        const response = await api.get("/auth/me");
        if (isMounted && response.data?.success && response.data?.data) {
          setUser(response.data.data);
        }
      } catch {
        if (isMounted) setUser(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    initAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (credentials) => {
    try {
      const response = await api.post("/auth/login", credentials);
      const userData = response.data?.data;
      setUser(userData);
      return { success: true, user: userData };
    } catch (error) {
      const message =
        error.response?.data?.message || error.message || "Failed to log in";
      const fieldErrors = error.response?.data?.errors || null;
      return { success: false, message, fieldErrors };
    }
  };

  const register = async (formData) => {
    try {
      const response = await api.post("/auth/register", formData);
      const userData = response.data?.data;
      setUser(userData);
      return { success: true, user: userData };
    } catch (error) {
      const message =
        error.response?.data?.message || error.message || "Registration failed";
      const fieldErrors = error.response?.data?.errors || null;
      return { success: false, message, fieldErrors };
    }
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (err) {
      console.error("[Logout Error]", err);
    } finally {
      setUser(null);
      router.push("/login");
      router.refresh();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
