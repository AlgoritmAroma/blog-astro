import type { Metadata } from "next";
import { involve, anticva } from "@/lib/fonts";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Блог Astro AI — ведическая астрология и AI-прогнозы",
    template: "%s — Блог Astro AI",
  },
  description:
    "Статьи о ведической астрологии, натальных картах, совместимости знаков зодиака и прогнозах от команды Astro AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${involve.variable} ${anticva.variable}`}>
      <body>
        <Header />
        <main style={{ paddingTop: 112 }}>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
