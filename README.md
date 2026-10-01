# website

Personal site built with [TanStack Start](https://tanstack.com/start) and deployed to [Cloudflare Workers](https://developers.cloudflare.com/workers/).

## Development

```bash
pnpm install
pnpm dev        # http://localhost:3000 (runs in workerd via @cloudflare/vite-plugin)
```

Routes live in `src/routes` (file-based routing; `src/routeTree.gen.ts` is generated).

## Deploy

```bash
pnpm preview    # build and serve the production bundle locally in workerd
pnpm deploy     # build and `wrangler deploy`
```

Worker config is in `wrangler.jsonc`. After changing it, run `pnpm cf-typegen` to regenerate `worker-configuration.d.ts`.
