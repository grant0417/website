import Link from "next/link";
import { Metadata, ServerRuntime } from "next/types";
import * as React from "react";
import "./globals.css";

export const runtime: ServerRuntime = "edge";

export const metadata: Metadata = {
  title: "404 - Page not found",
  description: "Page not found",
};

const NotFoundPage = () => {
  return (
    <main className="bg-zinc-950 min-h-screen flex flex-col justify-center">
      <div className="flex flex-col text-center gap-2">
        <h1 className="text-5xl font-bold text-white">Page not found</h1>
        <Link href="/" className="text-2xl text-white underline">
          {"< Go back to the homepage"}
        </Link>
      </div>
    </main>
  );
};

export default NotFoundPage;
