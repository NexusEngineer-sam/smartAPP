import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "SAMWEL CAMPUS OS", template: "%s | SAMWEL CAMPUS OS" },
  description: "A secure, intelligent operating system for university life.",
  applicationName: "SAMWEL CAMPUS OS",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Campus OS" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
