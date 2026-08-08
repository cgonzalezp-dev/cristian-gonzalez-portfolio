import { useCallback, useEffect, useState } from "react";

export type Route = "profile" | "strategy" | "games";

/**
 * Minimal hash router. GitHub Pages serves a single static file, so a real
 * router that relies on server-side paths would 404 on reload. Encoding the
 * top-level view in the URL hash (`#/strategy`) keeps deep links shareable and
 * reload-safe. Section anchors (`#exec-summary`) still work because we only
 * treat a hash that begins with `#/` as a route.
 */
function parse(hash: string): Route {
  if (hash.startsWith("#/strategy")) return "strategy";
  if (hash.startsWith("#/games")) return "games";
  return "profile";
}

export function useHashRoute(): { route: Route; navigate: (route: Route) => void } {
  const [route, setRoute] = useState<Route>(() =>
    typeof window === "undefined" ? "profile" : parse(window.location.hash),
  );

  useEffect(() => {
    const onHashChange = () => setRoute(parse(window.location.hash));
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const navigate = useCallback((next: Route) => {
    const hashByRoute: Record<Route, string> = {
      strategy: "#/strategy",
      games: "#/games",
      profile: "#/",
    };
    window.location.hash = hashByRoute[next];
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  return { route, navigate };
}
