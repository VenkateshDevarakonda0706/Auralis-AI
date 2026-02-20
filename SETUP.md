# Auralis AI Setup Guide

## Prerequisites

- Node.js 20+
- npm 10+
- Google AI API key
- Murf AI API key
- Google OAuth client credentials

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Create local env file from template:

```bash
cp env.example .env.local
```

3. Fill all required values in `.env.local`.

4. Validate env and start app:

```bash
npm run predeploy:check
npm run dev
```

5. Open `http://localhost:3000`.

## Quality checks

Run the full quality gate before pushing:

```bash
npm run ci
```

## Troubleshooting

- `Server is missing GOOGLE_AI_API_KEY`: add key to `.env.local` and restart.
- `Server is missing MURF_API_KEY`: add key to `.env.local` and restart.
- Google login fails: verify callback URL and `NEXTAUTH_URL`.
