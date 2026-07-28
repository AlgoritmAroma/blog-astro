"use client";

import { useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}
function getSnapshot() {
  return window.location.href;
}
function getServerSnapshot() {
  return "";
}

const NETWORKS = [
  {
    name: "ВКонтакте",
    shareUrl: (url: string, title: string) =>
      `https://vk.com/share.php?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`,
    icon: (
      <path d="M13.6 17.2c-5.6 0-8.8-3.9-8.9-10.3h2.8c.1 4.7 2.1 6.7 3.7 7.1V6.9h2.6v4.1c1.6-.2 3.2-2 3.8-4.1h2.6c-.4 2.6-2.3 4.5-3.6 5.2 1.3.6 3.5 2.2 4.3 5.1h-2.9c-.6-2-2.2-3.5-4.2-3.7v3.7h-.2z" />
    ),
  },
  {
    name: "Telegram",
    shareUrl: (url: string, title: string) =>
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
    icon: (
      <path d="M21 4.5l-2.8 14.2c-.2 1-.8 1.2-1.6.8l-4.4-3.2-2.1 2c-.2.2-.4.4-.9.4l.3-4.5 8.2-7.4c.4-.3-.1-.5-.5-.2L7.1 12.6l-4.4-1.4c-1-.3-1-1 .2-1.4l17.1-6.6c.8-.3 1.5.2 1 1.3z" />
    ),
  },
  {
    name: "Одноклассники",
    shareUrl: (url: string) => `https://connect.ok.ru/offer?url=${encodeURIComponent(url)}`,
    icon: (
      <path d="M12 2a4 4 0 110 8 4 4 0 010-8zm0 6a2 2 0 100-4 2 2 0 000 4zm-3.4 6.3a1 1 0 011.4-.2c.6.4 1.3.7 2 .8l-2.9 2.9a1 1 0 101.4 1.4l2.5-2.5 2.5 2.5a1 1 0 101.4-1.4l-2.9-2.9c.7-.1 1.4-.4 2-.8a1 1 0 111.2 1.6c-1 .7-2.1 1.1-3.2 1.3l3 3a1 1 0 01-1.4 1.4l-2.6-2.6-2.6 2.6a1 1 0 01-1.4-1.4l3-3c-1.1-.2-2.2-.6-3.2-1.3a1 1 0 01-.2-1.4z" />
    ),
  },
];

export default function ShareButtons({ title, compact = false }: { title: string; compact?: boolean }) {
  // window.location isn't available during SSR, so read it via
  // useSyncExternalStore — the server snapshot ("") matches the first client
  // render, then the real URL takes over without a hydration mismatch.
  const url = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <div className={`share-buttons${compact ? " share-buttons--compact" : ""}`}>
      {!compact && <span className="share-buttons__label">Поделиться:</span>}
      {NETWORKS.map((n) => (
        <a
          key={n.name}
          href={n.shareUrl(url, title)}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="share-buttons__btn"
          aria-label={`Поделиться в ${n.name}`}
          title={`Поделиться в ${n.name}`}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
            {n.icon}
          </svg>
        </a>
      ))}
    </div>
  );
}
