# ClaimGrid

> Claim a cell. Build your territory.

A real-time multiplayer territory game where users claim cells on a shared interactive grid. Built as an internship technical assignment demonstrating concurrent state management, real-time synchronization, and polished UI.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| Backend | Java 21, Spring Boot 3.5, Maven |
| Database | PostgreSQL 17 |
| Migrations | Flyway |
| Infrastructure | Docker, Docker Compose |

## Local Development

### Prerequisites

- Java 21
- Maven 3.9+
- Node.js 20+
- Docker & Docker Compose

### 1. Start PostgreSQL

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up db -d
```

### 2. Start Backend

```bash
cd backend
mvn spring-boot:run
```

The backend starts on [http://localhost:8080](http://localhost:8080).
Flyway runs database migrations automatically on startup.

### 3. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend starts on [http://localhost:5173](http://localhost:5173).

## Architecture

```
React (Vite)  →  REST + WebSocket  →  Spring Boot  →  PostgreSQL
```

- **PostgreSQL** is the authoritative source of truth for all game state.
- **WebSockets** push real-time cell claim events to all connected clients.
- **REST** provides initial game state snapshots and player registration.
- **Concurrent claims** are handled via atomic database operations — if two users click the same cell, exactly one succeeds.

## Project Status

🚧 **Phase 1 — Foundation** (current)
