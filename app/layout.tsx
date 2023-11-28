import { Metadata, ServerRuntime } from "next";
import "./globals.css";

export const runtime: ServerRuntime = "edge";

export const metadata: Metadata = {
  title: "Grant Gurvis",
  description: "Grant Gurvis",
  icons: "/images/icon.png",
  themeColor: "black",
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
