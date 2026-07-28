"use client";

import { useEffect, useRef } from "react";

// Fires exactly once per real mount, including under React's dev Strict Mode
// double-invoke (the ref instance survives that simulated
// mount→cleanup→mount, so the second invocation sees `fired.current === true`
// and skips).
export default function ViewTracker({ slug }: { slug: string }) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    fetch(`/api/posts/${slug}/view`, { method: "POST" }).catch(() => {});
  }, [slug]);

  return null;
}
