import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PayoutCheck",
  description: "See exactly where your marketplace settlement money went.",
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
