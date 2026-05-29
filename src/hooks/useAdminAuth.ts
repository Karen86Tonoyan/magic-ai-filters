/**
 * Admin auth — Lovable Cloud session + user_roles('admin').
 * Replaces the old sessionStorage / VITE_ADMIN_PASSWORD_SHA256 client-side gate.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

export interface AdminAuthState {
  isLoading: boolean;
  session: Session | null;
  isAdmin: boolean;
}

async function checkAdminRole(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) return false;
  return !!data;
}

export function useAdminAuth() {
  const [state, setState] = useState<AdminAuthState>({
    isLoading: true, session: null, isAdmin: false,
  });

  useEffect(() => {
    // Listener first, then initial getSession (Supabase pattern).
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setState({ isLoading: false, session: null, isAdmin: false });
        return;
      }
      // Defer role lookup to avoid deadlock inside the listener.
      setTimeout(async () => {
        const isAdmin = await checkAdminRole(session.user.id);
        setState({ isLoading: false, session, isAdmin });
      }, 0);
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        setState({ isLoading: false, session: null, isAdmin: false });
        return;
      }
      const isAdmin = await checkAdminRole(session.user.id);
      setState({ isLoading: false, session, isAdmin });
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error?.message ?? null;
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: `${window.location.origin}/` },
    });
    return error?.message ?? null;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return { ...state, signIn, signUp, signOut };
}
