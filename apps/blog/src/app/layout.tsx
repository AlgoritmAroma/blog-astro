import type { Metadata } from "next";
import { involve, anticva } from "@/lib/fonts";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import YandexMetrika from "@/components/YandexMetrika";
import { blogSiteUrl, mainSiteUrl, readerIsSignedIn } from "@/lib/site";
import "./globals.css";

const baseMetadata: Metadata = {
  title: {
    default: "Блог Astro AI — ведическая астрология и AI-прогнозы",
    template: "%s — Блог Astro AI",
  },
  description:
    "Статьи о ведической астрологии, натальных картах, совместимости знаков зодиака и прогнозах от команды Astro AI.",
};

// A function rather than a constant so the origin comes from the running
// container's env, not from whatever was set at `next build`.
export async function generateMetadata(): Promise<Metadata> {
  return {
    // Resolves the pages' relative canonical links against the blog's own
    // origin — see blogSiteUrl().
    metadataBase: new URL(blogSiteUrl()),
    ...baseMetadata,
  };
}

// The header and footer read the main site's origin from the container's
// environment (lib/site.ts). Reading `process.env` is not a "dynamic API" as
// far as Next is concerned, so without this the one route that *would* be
// prerendered — the 404 — bakes in the value present at `next build`, and the
// dev container's 404 page links a reader straight into production. Every
// other route is already dynamic (they read the database), so this costs
// nothing in practice.
export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const mainSite = mainSiteUrl();
  const signedIn = await readerIsSignedIn();

  return (
    <html lang="ru" className={`${involve.variable} ${anticva.variable}`}>
      <body>
        <div className="page-stars" aria-hidden="true" />
        <Header mainSite={mainSite} signedIn={signedIn} />
        <main style={{ paddingTop: 112 }}>{children}</main>
        <Footer mainSite={mainSite} />
        <YandexMetrika />
      </body>
    </html>
  );
}
