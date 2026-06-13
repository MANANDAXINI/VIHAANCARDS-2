"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { signInWithPopup, signOut as firebaseSignOut } from "firebase/auth";
import { authApi, setToken, getToken } from "@/lib/api";
import { getFirebaseAuthErrorMessage } from "@/lib/auth-validation";
import { getFirebaseAuth, googleProvider } from "@/lib/firebase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const data = await authApi.me();
      setUser(data.account);
    } catch {
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setReady(true));
  }, [refresh]);

  const login = useCallback(async (phone, password, accountId) => {
    const data = await authApi.login(
      { phone, password, ...(accountId ? { accountId } : {}) },
      { silent: true }
    );
    if (data.needsBusinessPick) return data;
    setToken(data.token);
    setUser(data.account);
    return data;
  }, []);

  const loginWithGoogle = useCallback(async () => {
    const auth = getFirebaseAuth();
    if (!auth) throw new Error("Google sign-in is not configured. Use mobile login instead.");

    let result;
    try {
      result = await signInWithPopup(auth, googleProvider);
    } catch (error) {
      throw new Error(getFirebaseAuthErrorMessage(error));
    }

    const idToken = await result.user.getIdToken();

    try {
      const data = await authApi.googleLogin({ idToken }, { silent: true });
      setToken(data.token);
      setUser(data.account);
      return data;
    } catch (error) {
      await firebaseSignOut(auth).catch(() => {});
      const apiMessage = error?.message;
      if (apiMessage && apiMessage !== "Request failed") {
        throw new Error(apiMessage);
      }
      throw new Error("Google sign-in failed while contacting the server. Check API URL and Render Firebase settings.");
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    const auth = getFirebaseAuth();
    if (auth) await firebaseSignOut(auth).catch(() => {});
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, ready, login, loginWithGoogle, logout, refresh, setUser }),
    [user, loading, ready, login, loginWithGoogle, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

/** Returns null until client hydration completes — prevents SSR mismatch */
export function useAuthUser() {
  const { user, ready } = useAuth();
  return ready ? user : null;
}
