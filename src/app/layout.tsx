import type { Metadata } from "next";
import { Figtree, Instrument_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-display-face",
  weight: ["400", "500"],
  display: "swap",
});

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-body-face",
  weight: ["400", "500"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-outlier-face",
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ERP Système de Gestion Documentaire",
  description: "Système de gestion documentaire pour entreprise algérienne",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={cn(
        "font-sans",
        instrumentSans.variable,
        figtree.variable,
        jetbrainsMono.variable
      )}
    >
      <body className="antialiased font-sans">{children}</body>
    </html>
  );
}
