# Midpoint

**Find a place to meet that's fair to everyone** — not just convenient for whoever picked it.

Drop each person's starting point on a map, pick a vibe, and Midpoint returns ranked venues that minimize the travel burden across the whole group.

---

## The problem

"Find a place near me" tools solve for one person. Midpoint solves the harder version: **fairness across N people with different starting points**.

A spot that's a 5-minute walk for four people and a 50-minute train ride for the fifth isn't fair — but its *average* travel time looks great. Averages hide the person absorbing the whole burden, so Midpoint optimizes for the worst-off participant by default.

---

## How it works

| Stage | Method | Why |
|---|---|---|
| 1. Baseline | Centroid (mean lat/lng) | Always-available fallback |
| 2. Meeting point | **Geometric median** via Weiszfeld's algorithm | Minimizes *total* distance, not *squared* distance — far more resistant to one distant participant |
| 3. Candidates | Overpass API union query | Real venues near the median, matched across several OSM tag types |
| 4. Ranking | **Minimize the maximum** individual cost | A venue great for four and terrible for one is not fair |

### Why the geometric median

The centroid minimizes the sum of **squared** distances. That squaring is exactly what lets one far-flung participant drag the result toward them. The geometric median minimizes the sum of **raw** distances and stays anchored to the group.

### Why coordinates get projected first

All optimization happens in a **local equirectangular projection**, in meters. Working directly in degrees treats a degree of longitude as equal to a degree of latitude — true only at the equator. At 60°N a longitude degree is roughly half the length, so unprojected results skew east–west.

### Fairness is configurable

```json
{ "minimize": "max" }      // default — protect the worst-off person
{ "minimize": "average" }  // optimize total group convenience
```

Same origins, same candidates, **different winner**. That switch is the whole thesis of the project, and there's a test asserting it.

---

## Vibes

OSM has no single "fun stuff" tag — a park is `leisure=park`, a viewpoint is `tourism=viewpoint`, a cafe is `amenity=cafe`. Users pick a mood; the app handles the translation.

| Vibe | Includes |
|---|---|
| **High energy** | Trampoline parks, laser tag, bowling, arcades, escape rooms, climbing, theme parks, ice rinks |
| **Chill & scenic** | Parks, gardens, viewpoints, beaches, picnic sites, nature reserves |
| **Food & drink** | Cafes, restaurants, ice cream, bubble tea, bakeries |
| **Culture & indoor** | Museums, galleries, cinemas, theatres, libraries, bookshops |

Each vibe becomes a single Overpass union query — one round trip and one cache entry, not one per tag.

---

## Architecture

| Package | Responsibility |
|---|---|
| `packages/optimizer` | Geometric median, projection, haversine, fairness ranking. **Pure — no network, no I/O** |
| `packages/cache` | `Cache` interface with in-memory and Redis implementations |
| `packages/places` | Overpass client, vibe→tag mapping, retry with backoff |
| `api` | Fastify service and map UI |

The optimizer takes plain coordinate arrays and a cost matrix. It has no idea Overpass or Redis exist, which is what makes it testable in microseconds.

---

## Tech stack

| Layer | Choice |
|---|---|
| Language | TypeScript, Node 22 |
| Monorepo | pnpm workspaces |
| Server | Fastify |
| Cache | Redis (`ioredis`) |
| Places data | OpenStreetMap via Overpass |
| Map | Leaflet |
| Tests | Vitest |
| Lint / format | Biome |
| CI | GitHub Actions, with a live Redis service container |

---

## Running locally

```bash
brew install redis
brew services start redis

pnpm install
```

```bash
cd api
REDIS_URL=redis://localhost:6379 pnpm dev
```

Open **http://localhost:3000**.

Without `REDIS_URL` the app falls back to an in-memory cache and still works — the cache just doesn't survive a restart.

---

## API

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/` | Map UI |
| `GET` | `/health` | Liveness check |
| `GET` | `/vibes` | Available vibes, so the UI has one source of truth |
| `POST` | `/meet` | Ranked meeting spots |

```bash
curl -s -X POST http://localhost:3000/meet \
  -H 'Content-Type: application/json' \
  -d '{
    "origins": [
      { "lat": 40.7128, "lng": -74.0060 },
      { "lat": 40.7580, "lng": -73.9855 },
      { "lat": 40.6892, "lng": -74.0445 }
    ],
    "vibe": "food_drink",
    "minimize": "max"
  }'
```

Each candidate comes back with `maxCostMeters`, `averageCostMeters`, and `fairnessGap` (max − min) so the tradeoff is visible, not just the winner.

---



