import * as React from 'react';
import { Link } from 'gatsby';
import { Helmet } from 'react-helmet';
import '../styles/global.css';

// markup
const NotFoundPage = () => {
  return (
    <main className="bg-gray-900 min-h-screen flex flex-col justify-center">
      <Helmet>
        <title>404 - Page Not Found</title>
      </Helmet>
      <div className="flex flex-col text-center gap-2">
        <h1 className="text-5xl font-bold text-white">Page not found</h1>
        <Link to="/" className="text-2xl text-white underline">
          {'< Go back to the homepage'}
        </Link>
      </div>
    </main>
  );
};

export default NotFoundPage;
