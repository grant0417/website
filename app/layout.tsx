import { Metadata, ServerRuntime, Viewport } from "next";
import "./globals.css";

export const runtime: ServerRuntime = "edge";

export const viewport: Viewport = {
  themeColor: "black",
  colorScheme: "dark",
};

export const metadata: Metadata = {
  title: "Grant Gurvis",
  description: "Grant Gurvis",
  icons: "/images/icon.png",
  other: {
    "darkreader-lock": "true",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
