import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import type { User as FirebaseUser } from "firebase/auth";
import { useCallback, useEffect, useState } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
  initializationDelayMs?: number;
};

export function useAuth(options?: UseAuthOptions) {
  const {
    redirectOnUnauthenticated = false,
    redirectPath,
    initializationDelayMs = 0,
  } = options ?? {};
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const utils = trpc.useUtils();

  useEffect(() => {
    let active = true;
    let unsubscribe: () => void = () => undefined;
    const initialize = () => {
      void import("@/lib/firebaseAuth")
        .then(({ observeFirebaseAuth }) => {
          if (!active) return;
          unsubscribe = observeFirebaseAuth(user => {
            setFirebaseUser(user);
            setAuthLoading(false);
            void utils.auth.me.invalidate();
          });
        })
        .catch(() => {
          if (active) setAuthLoading(false);
        });
    };
    const timeout = window.setTimeout(initialize, initializationDelayMs);
    return () => {
      active = false;
      window.clearTimeout(timeout);
      unsubscribe();
    };
  }, [initializationDelayMs, utils.auth.me]);

  const meQuery = trpc.auth.me.useQuery(undefined, {
    enabled: Boolean(firebaseUser),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const logout = useCallback(async () => {
    const { signOutFirebase } = await import("@/lib/firebaseAuth");
    await signOutFirebase();
    utils.auth.me.setData(undefined, null);
    await utils.invalidate();
  }, [utils]);

  const loading = authLoading || (Boolean(firebaseUser) && meQuery.isLoading);
  const user = firebaseUser ? (meQuery.data ?? null) : null;

  useEffect(() => {
    if (!redirectOnUnauthenticated || loading || user) return;
    if (redirectPath && window.location.pathname !== redirectPath) {
      window.location.href = redirectPath;
    } else if (!redirectPath) {
      startLogin();
    }
  }, [loading, redirectOnUnauthenticated, redirectPath, user]);

  return {
    user,
    loading,
    error: meQuery.error ?? null,
    isAuthenticated: Boolean(user),
    refresh: () => meQuery.refetch(),
    logout,
  };
}
