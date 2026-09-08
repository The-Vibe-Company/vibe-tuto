# Validation — 2026-09-08

- Web: 356 Vitest tests pass; extension regression suite: 71 pass.
- macOS: 14 Swift tests pass; signed Xcode build and native UI checked.
- TypeScript, ESLint and the production Next.js build pass.
- Real Mac connection: missing credential → browser approval → recorder ready,
  with no copied API key. Original Mac settings restored after validation.
- Isolated local Supabase: pairing SQL concurrency/retry/revocation checks pass.
- Browser/MCP replay (`scripts/test-agent-flow.mjs`): synthetic human capture and
  WAV upload, idempotent retry, 10 MCP tools, annotated step, changed preview after
  correction, invalid geometry rejection, valid PDF and public link.
- Browser: editor and sharing controls inspected, public mobile layout has no
  horizontal overflow, making a guide private revokes its public PDF endpoint.
- Anonymous database role cannot read raw source rows or screenshot objects.

The recording replay uses a synthetic fixture; it is not a replacement for a
long manual recording of a real application. Cloud deployment has not been made.
Cloud requires the server-side service role key and the new database migrations.
Audio uploads remain subject to hosting request-size limits. Transcription needs
Deepgram credentials; editing/rendering does not.
