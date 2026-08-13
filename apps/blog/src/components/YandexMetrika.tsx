"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";

const COUNTER_ID = 96138966;

// The `init` call below already sends the pageview for whichever URL the
// browser loaded, and everything after that is a client-side App Router
// navigation that never re-runs the script. So we re-send `hit` ourselves on
// every pathname/query change — skipping the very first effect run, which
// would otherwise double-count the landing page.
function HitTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialHit = useRef(true);

  useEffect(() => {
    if (initialHit.current) {
      initialHit.current = false;
      return;
    }
    const ym = (window as unknown as { ym?: (...args: unknown[]) => void }).ym;
    ym?.(COUNTER_ID, "hit", window.location.href, {
      referer: document.referrer,
    });
  }, [pathname, searchParams]);

  return null;
}

export default function YandexMetrika() {
  // Local `next dev` runs would otherwise land in the counter's real stats.
  if (process.env.NODE_ENV !== "production") return null;

  return (
    <>
      <Script id="yandex-metrika" strategy="afterInteractive">
        {`(function(m,e,t,r,i,k,a){
   m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
   m[i].l=1*new Date();
   for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
   k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
})(window, document,'script','https://mc.yandex.ru/metrika/tag.js', 'ym');

ym(${COUNTER_ID}, 'init', {webvisor:true, clickmap:true, ecommerce:"dataLayer", referrer: document.referrer, url: location.href, accurateTrackBounce:true, trackLinks:true});`}
      </Script>
      <noscript>
        <div>
          {/* A tracking pixel, not content — next/image would defeat the point. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://mc.yandex.ru/watch/${COUNTER_ID}`}
            style={{ position: "absolute", left: "-9999px" }}
            alt=""
          />
        </div>
      </noscript>
      <Suspense fallback={null}>
        <HitTracker />
      </Suspense>
    </>
  );
}
