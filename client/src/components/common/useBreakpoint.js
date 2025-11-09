import React from "react";

const queries = {
  xs: "(max-width: 480px)",
  sm: "(max-width: 640px)",
  md: "(max-width: 768px)",
  lg: "(max-width: 1024px)",
  xl: "(max-width: 1280px)",
};

const useBreakpoint = (breakpoint = "sm") => {
  const query = queries[breakpoint] ?? queries.sm;
  const isServer = typeof window === "undefined";
  const [matches, setMatches] = React.useState(() =>
    isServer ? false : window.matchMedia(query).matches,
  );

  React.useEffect(() => {
    if (isServer) return undefined;
    const mediaQuery = window.matchMedia(query);
    const handler = (event) => setMatches(event.matches);
    handler(mediaQuery);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [query, isServer]);

  return matches;
};

export default useBreakpoint;

