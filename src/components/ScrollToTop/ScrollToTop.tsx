import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

function hasScrollRestoration(pathname: string): boolean {
  if (pathname === "/listings") return true;
  if (/^\/profile\/[^/]+\/listings$/.test(pathname)) return true;
  return false;
}

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    if (hasScrollRestoration(pathname)) return;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);

  return null;
}
