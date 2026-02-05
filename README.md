# CapTuto

Create professional tutorials in seconds. Record your screen while talking, and CapTuto automatically generates a step-by-step guide with screenshots and text.

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + React
- **Styling**: Tailwind CSS + shadcn/ui
- **Extension**: Chrome Extension (Manifest V3)
- **Backend**: Next.js API Routes
- **Database**: Supabase (Postgres)
- **Storage**: Supabase Storage
- **Transcription**: Deepgram
- **Auth**: Supabase Auth

## Project Structure

```
captuto/
├── apps/
│   ├── web/              # Next.js app
│   └── extension/        # Chrome extension
├── packages/
│   └── shared/           # Shared types
├── supabase/             # Database migrations
└── ...
```

## Prerequisites

- Node.js 18+
- pnpm 8+
- Supabase account
- Deepgram account (for transcription)

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment variables

Copy the example file and fill in your values:

```bash
cp apps/web/.env.example apps/web/.env.local
```

#### Required variables

| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | [Supabase Dashboard](https://supabase.com/dashboard) → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key (public) | Same as above |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (secret) | Same as above |
| `DEEPGRAM_API_KEY` | Deepgram API key | [Deepgram Console](https://console.deepgram.com) |
| `NEXT_PUBLIC_APP_URL` | App URL | `http://localhost:3000` for dev |

### 3. Run the development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Development

### Commands

```bash
# Start development server
pnpm dev

# Build for production
pnpm build

# Run linter
pnpm lint
```

### Monorepo

This project uses [Turborepo](https://turbo.build/repo) for monorepo management.

## License

Private - The Vibe Company
