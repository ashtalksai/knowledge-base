# Knowledge Base

Personal knowledge capture system ("Second Brain") for Ash and Jarvis.

## Setup

1. Create a PostgreSQL database with pgvector extension
2. Copy `.env.example` to `.env` and fill in values
3. Install dependencies: `pnpm install`
4. Run migrations: `pnpm db:migrate`
5. Start dev server: `pnpm dev`

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection string
- `OPENAI_API_KEY` - For embeddings and summaries
- `KB_API_KEY` - Optional API key for authentication

## API Endpoints

- `GET /api/knowledge/entries` - List entries
- `POST /api/knowledge/entries` - Create entry
- `GET /api/knowledge/entries/:id` - Get entry
- `PATCH /api/knowledge/entries/:id` - Update entry
- `DELETE /api/knowledge/entries/:id` - Delete entry
- `POST /api/knowledge/search` - Semantic search
- `GET /api/knowledge/tags` - List tags
- `POST /api/knowledge/tags` - Create tag
- `DELETE /api/knowledge/tags/:id` - Delete tag

## CLI Usage

```bash
# Add a note
pnpm kb add --title "Note" --content "..." --source manual --tags ai,trading

# Search
pnpm kb search "machine learning"

# List recent
pnpm kb list --limit 10

# Add tag to entry
pnpm kb tag <entry-id> important
```

## Features

- Full-text search with PostgreSQL
- Semantic search with OpenAI embeddings
- Auto-generated summaries
- Tag-based organization
- Multiple source types (Twitter, LinkedIn, Reddit, etc.)
