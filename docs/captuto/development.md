# Local development and agent validation

## Start an isolated environment

Requirements: Docker running, Supabase CLI, Node and pnpm.

```sh
./scripts/dev-start.sh --stop
./scripts/dev-start.sh --local
```

This starts this project's Supabase containers, applies local migrations, seeds
`admin@thevibecompany.co` / `adminadmin`, writes gitignored local credentials, and
starts the web app at http://localhost:3678. It does not change cloud `.env.local`.
Use `./scripts/dev-start.sh --status` to inspect frontend mode. Stop the frontend
with `./scripts/dev-start.sh --stop`; stop only this backend with
`./scripts/dev-backend.sh --stop`. To return to the cloud configuration, stop then
run `./scripts/dev-start.sh` without `--local`.

Local AI transcription still needs DEEPGRAM_API_KEY. Captures, edits, previews,
sharing and PDF work without AI provider keys: the external agent writes the guide.

## Connect the Mac recorder

In Mac Settings, use the workspace address `http://localhost:3678` for local
development. When no API token is configured, select Connect, sign in in the
browser and authorize the recorder. The app retrieves its credential automatically;
no copy-paste is required. Requests expire after five minutes and can be restarted.

## MCP

Create an API token under Settings. Set it as CAPTUTO_API_TOKEN in the environment
of the MCP client (never commit tokens), then:

```sh
codex mcp add captuto --url http://localhost:3678/api/mcp --bearer-token-env-var CAPTUTO_API_TOKEN
```

Tools: list_tutorials, read_tutorial, view_source, transcribe_audio,
update_tutorial, save_steps, remove_step, preview_step, share_tutorial, export_pdf.

Human capture is the only capture flow. The agent uses original screenshots,
image-relative coordinates (0–1, x right/y down), audio and timestamped transcript.
Font sizes and stroke widths use a 1000-pixel reference screenshot width and scale
proportionally in the editor, preview, public guide and PDF.
Save steps with stable UUIDs, inspect preview_step images, correct and repeat.
PDF is an embedded MCP resource; exporting does not publish the guide.

## Reproducible full-path smoke test

Use agent-browser to log in to localhost in a session named `captuto-local`.
Then run:

```sh
CAPTUTO_BROWSER_SESSION=captuto-local node scripts/test-agent-flow.mjs
```

It creates a labelled synthetic Companion recording and temporary token; uploads
an audio fixture; retries ingestion; initializes the actual HTTP MCP server;
authors/annotates a step; inspects changed preview bytes after a correction;
checks invalid geometry rejection; produces a PDF and public link.
It never operates the target application. The fixture remains for visual checks.
After inspecting the editor/public page in agent-browser:

```sh
CAPTUTO_BROWSER_SESSION=captuto-local node scripts/test-agent-flow.mjs --cleanup
```

All website automation uses agent-browser; no Playwright library is used.
Unit validation: `pnpm test:run`. Build: `pnpm --filter @captuto/web build`
(stop frontend first to avoid sharing `.next` output with the dev server).

## Cloud prerequisites

SUPABASE_SERVICE_ROLE_KEY is required server-side for MCP and public flattened
rendering. It must never use NEXT_PUBLIC_ prefix. New migrations remove anonymous
raw-source/storage access so blur cannot be bypassed through original captures.
Deploy code and migrations together via the existing CI/CD; no manual Vercel deploy.
Existing signed raw-image URLs may remain usable until their previous expiry.

### Deployment order and recovery

Configure `SUPABASE_SERVICE_ROLE_KEY` before deploying this branch. Deploy the
server routes through CI/CD before (or together with) the policy-removal migration:
old anonymous public readers cannot read guides after that migration. Prefer a
short controlled release window if hosting and database pipelines run separately.
The new desktop-connection table and source metadata column are additive.

If a release fails, keep raw-capture access private and roll forward to the fixed
server routes. Rolling back only the frontend can break public viewing. Do not
restore anonymous raw screenshot policies as a recovery shortcut: that reopens
access to content hidden by blur. Existing owner editing and stored captures
remain available. Pairing can be disabled by withholding its new routes; its
expired requests and tokens do not require dropping data.

Pairing admission is limited in PostgreSQL to ten requests per requester within
five minutes and 2,000 outstanding records overall. Cleanup deletes at most100
expired records per request. Configure trusted `x-vercel-forwarded-for` or
`x-real-ip` headers at the hosting proxy; without either, requests share one
anonymous bucket. Raw addresses are not stored. Ship the admission migration
with the updated route.

Checkout uses stable Stripe idempotency keys and checks existing subscriptions
at the provider before creating a subscription session, including while webhooks
are delayed. See [Stripe Checkout](https://docs.stripe.com/api/checkout/sessions/create).
