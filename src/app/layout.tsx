import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Permanence",
  description: "Gestion des permanences et envoi automatique des plannings",
};

const CLIENT_PREFS_SCRIPT = `(function(){try{var t=localStorage.getItem("permanence-theme");var d=t?t==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d);if(localStorage.getItem("permanence-sidebar")==="collapsed"){document.documentElement.classList.add("sidebar-collapsed");}}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-100 text-slate-900">
        <script dangerouslySetInnerHTML={{ __html: CLIENT_PREFS_SCRIPT }} />
        {children}
      </body>
    </html>
  );
}
