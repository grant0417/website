import * as React from "react";
import { Link } from "gatsby";
import "../styles/global.css";

const Head = () => <title>404 - Page Not Found</title>;

const NotFoundPage = () => {
  return (
    <main className="bg-slate-900 min-h-screen flex flex-col justify-center">
      <div className="flex flex-col text-center gap-2">
        <h1 className="text-5xl font-bold text-white">Page not found</h1>
        <Link to="/" className="text-2xl text-white underline">
          {"< Go back to the homepage"}
        </Link>
      </div>
    </main>
  );
};

export default NotFoundPage;
