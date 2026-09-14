import type { Metadata } from "next";
import { involve, anticva } from "@/lib/fonts";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import YandexMetrika from "@/components/YandexMetrika";
import { mainSiteUrl } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Блог Astro AI — ведическая астрология и AI-прогнозы",
    template: "%s — Блог Astro AI",
  },
  description:
    "Статьи о ведической астрологии, натальных картах, совместимости знаков зодиака и прогнозах от команды Astro AI.",
};

// The header and footer read the main site's origin from the container's
// environment (lib/site.ts). Reading `process.env` is not a "dynamic API" as
// far as Next is concerned, so without this the one route that *would* be
// prerendered — the 404 — bakes in the value present at `next build`, and the
// dev container's 404 page links a reader straight into production. Every
// other route is already dynamic (they read the database), so this costs
// nothing in practice.
export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const mainSite = mainSiteUrl();

  return (
    <html lang="ru" className={`${involve.variable} ${anticva.variable}`}>
      <body>
        <div className="page-stars" aria-hidden="true" />
        <Header mainSite={mainSite} />
        <main style={{ paddingTop: 112 }}>{children}</main>
        <Footer mainSite={mainSite} />
        <YandexMetrika />
      </body>
    </html>
  );
}
