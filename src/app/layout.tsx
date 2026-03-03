import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/Providers";
import FeedbackWidget from "@/components/feedback/FeedbackWidget";
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
  title: {
    default: 'Diamond Mechanics',
    template: '%s | Diamond Mechanics',
  },
  description: 'AI-powered mechanics coaching for baseball and softball coaches. Upload video, get instant pose analysis, and deliver targeted feedback to your athletes.',
  openGraph: {
    title: 'Diamond Mechanics',
    description: 'AI-powered mechanics coaching for baseball and softball coaches.',
    type: 'website',
    images: [{ url: '/opengraph-image.png', width: 1200, height: 630, alt: 'Diamond Mechanics' }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          {children}
          <FeedbackWidget />
        </Providers>
      </body>
    </html>
  );
}
