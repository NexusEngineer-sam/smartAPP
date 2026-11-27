import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "DATA CENTER | SAMWEL", description: "Private command centre for SAMWEL CAMPUS OS.", applicationName: "DATA CENTER", manifest: "/manifest.webmanifest", appleWebApp: { capable: true, title: "DATA CENTER", statusBarStyle: "black-translucent" } };
export const viewport: Viewport = { themeColor: "#090b18", width: "device-width", initialScale: 1 };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }
