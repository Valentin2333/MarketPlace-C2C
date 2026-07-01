import { useEffect, useState } from "react";
import { supabase } from "./supabase";

type CurrentUser = {
  id: string;
  email: string | null;
  role: string | null;
};

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    const load = async (userId: string, email: string | null) => {
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();
      if (!active) return;
      setUser({ id: userId, email, role: data?.role ?? null });
      setReady(true);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;
      if (session?.user) {
        load(session.user.id, session.user.email ?? null);
      } else {
        setUser(null);
        setReady(true);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      if (session?.user) {
        load(session.user.id, session.user.email ?? null);
      } else {
        setUser(null);
        setReady(true);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return {
    userId: user?.id ?? null,
    email: user?.email ?? null,
    role: user?.role ?? null,
    isAdmin: user?.role === "admin",
    isBanned: user?.role === "banned",
    ready,
  };
}
