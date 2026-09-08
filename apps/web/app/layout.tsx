import type { Metadata } from "next";
import localFont from "next/font/local";
import { Inter, Sora } from "next/font/google";
import { QueryProvider } from "@/components/providers/QueryProvider";

import "./globals.css";

const annotationFont = localFont({
  src: '../lib/render/fonts/NotoSans-Regular.ttf',
  display: 'swap',
  variable: '--font-annotation',
});

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const sora = Sora({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-heading",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "CapTuto",
  description: "Create professional tutorials in just a few clicks"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${sora.variable} ${annotationFont.variable} font-sans`}>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
