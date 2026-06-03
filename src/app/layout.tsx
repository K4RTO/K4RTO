import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "K4RTO",
  description: "macOS Tahoe Desktop Environment",
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
