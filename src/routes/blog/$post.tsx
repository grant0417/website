import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/blog/$post")({
  component: Post,
  head: () => ({ meta: [{ title: "Grant Gurvis" }] }),
});

function Post() {
  const params = Route.useParams();
  return <div className="text-white">{JSON.stringify(params)}</div>;
}
