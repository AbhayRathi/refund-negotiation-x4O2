import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Refund Negotiation Dashboard",
  description: "AI-powered payment negotiation system for web crawls",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
