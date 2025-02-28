# Durable Search

A turbopuffer-esque vector search api using Cloudflare Durable Objects and the Agent SDK.

## Overview

This example demonstrates how to build a simple vector search service using Cloudflare's Durable Objects and the Agent SDK. The implementation provides:

- Vector storage with SQLite persistence
- Cosine similarity search
- Document attributes storage
- REST API for upsert and query operations

## Features

- **Persistent Storage**: Vectors and attributes are stored in SQLite tables via the Agent SDK
- **Efficient Similarity Search**: Uses cosine similarity to find the most relevant documents
- **Attribute Storage**: Store and retrieve metadata alongside vectors
- **REST API**: Simple API for upsert and query operations
- **Comprehensive Tests**: Unit and integration tests for all functionality

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
  "distance_metric": "cosine"
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
  },
  {
    "id": "doc2",
    "score": 0.1,
    "attributes": {
      "title": "Second Document",
      "category": "B"
    }
  }
]
```

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
