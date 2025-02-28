# Durable Search

> a smol memory store for your ai agents

This project is heavily inspired by [turbopuffer](https://turbopuffer.com/). Built on top of Cloudflare Durable Objects and the new Agent SDK.

## Features

- **Persistent Storage**: Vectors and attributes are stored in SQLite tables via the Agent SDK
- **Similarity Search**: Uses cosine similarity to find the most relevant documents
- **Attribute Storage**: Store and retrieve metadata alongside vectors
- **Filtering**: Filter results by attributes using a simple syntax that mimics the turbopuffer filter syntax
- **REST API**: Simple API for upsert and query operations

## API

### Upsert Documents

```
POST /v1/namespaces/:namespace
```

Request body:

```json
{
  "ids": ["doc1", "doc2"],
  "vectors": [
    [1, 0, 0],
    [0, 1, 0]
  ],
  "attributes": {
    "title": ["First Document", "Second Document"],
    "category": ["A", "B"]
  }
}
```

### Query Documents

```
POST /v1/namespaces/:namespace/query
```

Request body:

```json
{
  "vector": [1, 0.1, 0],
  "top_k": 10,
  "distance_metric": "cosine",
  "filters": ["And", [["title", "Eq", "First Document"]]]
}
```

Response:

```json
[
  {
    "id": "doc1",
    "score": 0.995,
    "attributes": {
      "title": "First Document",
      "category": "A"
    }
  }
]
```

#### Filter Syntax

Filters work very similarly to the [turbopuffer filter syntax](https://turbopuffer.com/docs/query#filtering-parameters).

I would recommend if you are needing alot of them to just use turbopuffer :)

## Development

### Prerequisites

- Node.js
- pnpm

### Setup

```bash
# Install dependencies
pnpm install

# Start local development server
pnpm dev

# Run tests
pnpm test
```

### Testing

The implementation includes:

- Unit tests for the AgentSearch class
- Integration tests for the API endpoints
- Mock implementations for testing SQLite operations

Run tests with:

```bash
pnpm test
```

## Deployment

Deploy to Cloudflare Workers:

```bash
pnpm deploy
```

### Scripts

```bash
bun run scripts/upsert.ts
bun run scripts/query.ts
bun run scripts/delete.ts
```

These run on against the local server (localhost:8787)
