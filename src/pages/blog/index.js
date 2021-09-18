import * as React from 'react';
import { Link, graphql } from 'gatsby';

export default function Index({ data }) {
  const { edges: posts } = data.allMarkdownRemark;
  console.log(posts);
  return (
    <main className="bg-gray-900 min-h-screen flex flex-col justify-center">
      {/* {posts
        .map(({ node: post }) => {
          return (
            <div key={post.id}>
              <h1>
                <Link to={`/blog${post.frontmatter.slug}`}>{post.frontmatter.title}</Link>
              </h1>
              <h2>{post.frontmatter.date}</h2>
              <p>{post.excerpt}</p>
            </div>
          );
        })} */}
      <div className="flex flex-col text-center gap-2">
        <h1 className="text-5xl font-bold text-white">ComGrant Gurvis

A Computer Science student at the University of South Florida interested in Computer Science, Electronics, and Math.ing soon...</h1>
        <Link to="/" className="text-2xl text-white underline">
          {'< Go back to the homepage'}
        </Link>
      </div>
    </main>
  );
}

export const pageQuery = graphql`
  query IndexQuery {
    allMarkdownRemark(sort: { order: DESC, fields: [frontmatter___date] }) {
      edges {
        node {
          id
          frontmatter {
            title
            date(formatString: "MMMM DD, YYYY")
            slug
          }
        }
      }
    }
  }
`;
