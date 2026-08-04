import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

export const metadata: Metadata = {
  title: "Texas Longhorns Football Tracker",
  description: "Live schedule, roster, news, odds, rankings & gameday weather for Texas Longhorns football",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="min-h-full bg-slate-950 text-white antialiased">{children}</body>
    </html>
  );
}
