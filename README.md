# Moltbook 3D Topic Map

A dynamic 3D molecular visualization that organizes Moltbook content by topic, featuring hierarchical navigation (clusters → posts) and AI-powered semantic search.

## Features

- 🌐 **3D Molecular Visualization**: Topics displayed as glowing spheres with orbiting particles
- 🔍 **Semantic Search**: AI-powered search using OpenAI embeddings
- 📊 **Topic Clustering**: Automatic grouping using k-means + GPT-4 labeling
- 🎯 **Hierarchical Navigation**: Click topics to zoom into individual posts
- ⚡ **Real-time Updates**: PostgreSQL with pgvector for fast similarity search

## Tech Stack

- **Frontend**: Next.js 14, React Three Fiber, Tailwind CSS
- **3D Rendering**: Three.js via @react-three/fiber + @react-three/drei
- **Database**: PostgreSQL with pgvector extension
- **AI**: OpenAI API (text-embedding-3-small + GPT-4o-mini)
- **ORM**: Prisma

## Prerequisites

- Node.js 18+
- PostgreSQL 15+ with pgvector extension
- OpenAI API key

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/YOUR_USERNAME/moltbook-3d-map.git
cd moltbook-3d-map
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your database URL and OpenAI key
```

### 3. Set Up Database

```bash
# Make sure pgvector is installed in your PostgreSQL
# CREATE EXTENSION IF NOT EXISTS vector;

npx prisma migrate dev
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Railway Deployment

### 1. Create Railway Project

```bash
railway init
```

### 2. Add PostgreSQL

```bash
railway add postgres
```

### 3. Enable pgvector

Connect to your Railway PostgreSQL and run:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 4. Set Environment Variables

In Railway dashboard, add:
- `OPENAI_API_KEY`
- `MOLTBOOK_API_URL` (optional)

### 5. Deploy

```bash
railway up
```

## Data Ingestion

### Via API

```bash
curl -X POST http://localhost:3000/api/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "moltbookApiUrl": "https://your-moltbook-api.com/posts",
    "apiKey": "your-api-key",
    "limit": 100
  }'
```

### Check Status

```bash
curl http://localhost:3000/api/ingest?jobId=YOUR_JOB_ID
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/topics` | GET | List all topic clusters |
| `/api/posts` | GET | List posts (optionally by topic) |
| `/api/search?q=query` | GET | Semantic search |
| `/api/ingest` | POST | Start data ingestion |

## Project Structure

```
moltbook-3d-map/
├── src/
│   ├── app/
│   │   ├── api/          # API routes
│   │   ├── page.tsx      # Main visualization
│   │   └── layout.tsx
│   ├── components/
│   │   ├── MolecularMap.tsx    # 3D scene
│   │   ├── TopicCluster.tsx    # Topic node
│   │   ├── PostAtom.tsx        # Post node
│   │   ├── SearchOverlay.tsx   # Search UI
│   │   └── PostDetail.tsx      # Detail panel
│   ├── lib/
│   │   ├── db.ts         # Prisma client
│   │   ├── openai.ts     # OpenAI helpers
│   │   └── clustering.ts # Graph utilities
│   └── types/
│       └── index.ts      # TypeScript types
└── prisma/
    └── schema.prisma     # Database schema
```

## Controls

- **Rotate**: Click and drag
- **Zoom**: Scroll wheel
- **Select Topic**: Click on sphere
- **View Post**: Click on atom (when in topic view)
- **Search**: Type in search box (semantic AI search)

## License

MIT
