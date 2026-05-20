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
  title: "Short Editor Pro",
  description: "Advanced AI Video Editor built with Next.js and FFmpeg.wasm",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning={true} // Bật tính năng này ở thẻ html nếu cần
    >
      <body 
        className="min-h-full flex flex-col" 
        suppressHydrationWarning={true} // Chốt chặn quan trọng nhất ở đây
      >
        {children}
      </body>
    </html>
  );
}