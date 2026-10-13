import { useCallback } from "react";
import {
  useBrowserLocation,
  navigate as browserNavigate,
} from "wouter/use-browser-location";

/**
 * Custom location hook for Wouter that wraps route transitions in
 * the native View Transitions API (`document.startViewTransition`)
 * when available in the user's browser, respecting `prefers-reduced-motion`.
 */
export function useViewTransitionLocation(options?: {
  ssrPath?: string;
}): [string, typeof browserNavigate] {
  const [pathname] = useBrowserLocation(options);

  const navigateWithTransition = useCallback<typeof browserNavigate>(
    (to, navOpts) => {
      if (
        typeof document !== "undefined" &&
        "startViewTransition" in document &&
        typeof (document as Document & { startViewTransition: (cb: () => void) => void }).startViewTransition === "function" &&
        !window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        (document as Document & { startViewTransition: (cb: () => void) => void }).startViewTransition(() => {
          browserNavigate(to, navOpts);
        });
      } else {
        browserNavigate(to, navOpts);
      }
    },
    []
  );

  return [pathname, navigateWithTransition];
}
