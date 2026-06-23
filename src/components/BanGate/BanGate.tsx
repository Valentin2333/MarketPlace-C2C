import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { supabase } from "../../lib/supabase";
import BannedPage from "./BannedPage";

export default function BanGate({ children }: { children: ReactNode }) {
  const [checking, setChecking] = useState(true);
  const [banned, setBanned] = useState(false);

  useEffect(() => {
    let active = true;

    const evaluate = async (uid: string | null) => {
      if (!uid) {
        if (active) {
          setBanned(false);
          setChecking(false);
        }
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", uid)
        .maybeSingle();
      if (active) {
        setBanned(data?.role === "banned");
        setChecking(false);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      evaluate(session?.user?.id ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      evaluate(session?.user?.id ?? null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  if (checking) return null;
  if (banned) return <BannedPage />;
  return <>{children}</>;
}
