import { useEffect, useLayoutEffect, useRef } from "react";
import { useTheme } from "../Theme/useTheme";
import { TURNSTILE_SITE_KEY, loadTurnstileScript } from "./turnstileScript";
import styles from "./TurnstileWidget.module.css";

const MIN_WIDTH = 300;
const WIDGET_HEIGHT = 65;

type Props = {
  onToken: (token: string) => void;
  onError?: () => void;
  resetSignal?: number;
};

export default function TurnstileWidget({
  onToken,
  onError,
  resetSignal,
}: Props) {
  const { theme } = useTheme();
  const wrapRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const onTokenRef = useRef(onToken);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onTokenRef.current = onToken;
    onErrorRef.current = onError;
  });

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return;
    let cancelled = false;
    let widgetId: string | null = null;

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;
        widgetId = window.turnstile.render(containerRef.current, {
          sitekey: TURNSTILE_SITE_KEY!,
          theme,
          size: "flexible",
          callback: (token: string) => onTokenRef.current(token),
          "error-callback": () => onErrorRef.current?.(),
          "expired-callback": () => {
            if (widgetId) window.turnstile?.reset(widgetId);
          },
        });
      })
      .catch(() => {
        if (!cancelled) onErrorRef.current?.();
      });

    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [theme, resetSignal]);

  useLayoutEffect(() => {
    if (!TURNSTILE_SITE_KEY) return;
    const wrap = wrapRef.current;
    const inner = containerRef.current;
    if (!wrap || !inner) return;

    const apply = () => {
      const style = getComputedStyle(wrap);
      const paddingX =
        parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
      const width = wrap.clientWidth - paddingX;
      if (width === 0 || width >= MIN_WIDTH) {
        inner.style.width = "100%";
        inner.style.transform = "";
        wrap.style.height = "";
        wrap.style.minHeight = "";
        return;
      }
      const scale = width / MIN_WIDTH;
      inner.style.width = `${MIN_WIDTH}px`;
      inner.style.transformOrigin = "top left";
      inner.style.transform = `scale(${scale})`;
      wrap.style.height = `${WIDGET_HEIGHT * scale}px`;
      wrap.style.minHeight = `${WIDGET_HEIGHT * scale}px`;
    };

    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, []);

  if (!TURNSTILE_SITE_KEY) return null;

  return (
    <div ref={wrapRef} className={styles.widget}>
      <div ref={containerRef} className={styles.inner} />
    </div>
  );
}
