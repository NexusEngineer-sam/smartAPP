import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'SAMWEL CAMPUS OS', description: 'Student life, simplified.' };
export default function RootLayout({children}:{children:React.ReactNode}) {
 return <html lang="en"><body>{children}</body></html>;
}
