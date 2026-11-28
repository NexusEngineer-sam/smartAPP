import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./nexus-premium.css";
import LaunchSplash from "@/components/launch-splash";

export const metadata: Metadata = {
  title: { default: "NEXUS", template: "%s | NEXUS" },
  description: "NEXUS — One Ecosystem. Infinite Connections.",
  applicationName: "NEXUS",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "NEXUS" },
  openGraph: { title: "NEXUS", description: "One Ecosystem. Infinite Connections.", siteName: "NEXUS", type: "website" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: true,
  themeColor: "#101a38",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><LaunchSplash />{children}</body></html>;
}
