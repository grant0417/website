import React from "react";
import { Helmet } from "react-helmet";
import { graphql } from "gatsby"

export default function Template({ data }) {
  const { markdownRemark: post } = data;
  return (
    <div>
      <Helmet title={post.frontmatter.title} />
      <div>
        <h1>{post.frontmatter.title}</h1>
        <h2>{post.frontmatter.date}</h2>
        <div dangerouslySetInnerHTML={{ __html: post.html }} />
      </div>
    </div>
  );
}

export const pageQuery = graphql`
  query($id: String!) {
    markdownRemark(id: { eq: $id }) {
      html
      frontmatter {
        date(formatString: "MMMM DD, YYYY")
        slug
        title
      }
    }
  }
`