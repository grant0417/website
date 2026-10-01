declare module "virtual:blog-posts" {
  const posts: import("../plugins/blog-posts").CompiledPost[];
  export default posts;
}
