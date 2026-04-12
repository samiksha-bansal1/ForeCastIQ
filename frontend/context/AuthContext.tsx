"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { listenToAuth } from "@/lib/auth";
import type { User } from "firebase/auth";

const AuthContext = createContext<{
  user: User | null;
}>({ user: null });

export function AuthProvider({ children }: any) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = listenToAuth((u) => setUser(u));
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);