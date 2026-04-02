import { useEffect } from "react";

export default function useDashboardAutoRefresh(refresh, intervalMs = 30000) {
  useEffect(() => {
    if (typeof refresh !== "function") return undefined;

    const runRefresh = () => {
      Promise.resolve(refresh(true)).catch((error) => {
        console.error("Dashboard refresh failed", error);
      });
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        runRefresh();
      }
    };

    const intervalId = globalThis.setInterval(runRefresh, intervalMs);
    globalThis.addEventListener("focus", runRefresh);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      globalThis.clearInterval(intervalId);
      globalThis.removeEventListener("focus", runRefresh);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [intervalMs, refresh]);
}
