"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useAuthUser } from "@/context/AuthContext";
import { getLogoutRedirect } from "@/lib/redirect";

export function useLogout() {
  const { logout } = useAuth();
  const user = useAuthUser();
  const router = useRouter();

  return useCallback(async () => {
    const redirectTo = getLogoutRedirect(user);
    await logout();
    router.push(redirectTo);
    router.refresh();
  }, [logout, user, router]);
}
