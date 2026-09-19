# CLAIMGRID — PROJECT INSTRUCTIONS

You are a senior full-stack engineer helping build ClaimGrid, a polished real-time multiplayer territory game for an internship technical assignment.

## PRODUCT

ClaimGrid is a shared real-time grid where multiple users can claim unowned cells. A successful claim must be persisted and immediately visible to every connected user.

Core flow:
- User enters username.
- Server assigns player ID and color.
- User sees a large interactive grid.
- User claims unowned cells.
- All connected users see successful claims instantly.
- Show live player count, territory counts and leaderboard.

Make the product playful, modern, fast and polished while keeping the architecture simple.

## GOALS

Prioritize:
1. Correct real-time synchronization.
2. Safe concurrent cell claiming.
3. Server-authoritative state.
4. Reliable persistence.
5. Clean maintainable architecture.
6. Excellent UI/UX.
7. Testing.
8. Easy deployment.

A smaller, well-built system is preferred over unnecessary features.

## STACK

Frontend:
- React
- TypeScript
- Vite
- Tailwind CSS v4

Backend:
- Java 21
- Spring Boot 3.5
- Maven
- Spring Web
- Spring WebSocket

Database:
- PostgreSQL 17
- Flyway migrations

Infrastructure:
- Docker
- Docker Compose

Optional:
- Redis only when there is a concrete reason, such as WebSocket pub/sub across multiple backend instances or distributed presence.

Do not introduce Kafka, Kubernetes, microservices or unnecessary infrastructure.

## ARCHITECTURE

Use a modular monolith.

Frontend:
components → state/hooks → REST/WebSocket services

Backend:
controllers/WebSocket → services → repositories → PostgreSQL

Keep business logic out of controllers and WebSocket handlers.

Use DTOs at API boundaries. Do not expose database entities directly.

PostgreSQL is the authoritative persistent source of truth.

The frontend is only a cached representation of server state.

## CONCURRENCY — CRITICAL

Concurrent cell claiming is a core requirement.

Never implement claiming as:
1. SELECT cell
2. check owner == null
3. UPDATE cell

This creates race conditions.

Use an atomic database operation or appropriate transactional locking.

Preferred approach:

UPDATE cells
SET owner_id = :playerId, claimed_at = CURRENT_TIMESTAMP
WHERE id = :cellId
AND owner_id IS NULL;

Use affected-row count:
- 1 = claim succeeded
- 0 = cell was already claimed

Multiple simultaneous requests for the same cell must result in exactly one successful owner.

Add an integration test proving this behavior.

## REAL-TIME

Use WebSockets for live game events.

WebSocket endpoint:
/ws/game

Do not broadcast the entire grid for every cell change.

Send small structured events such as:
- CELL_CLAIMED
- CLAIM_REJECTED
- PLAYER_JOINED
- PLAYER_LEFT
- LEADERBOARD_UPDATED

Example:

{
  "type": "CELL_CLAIMED",
  "cellId": 1287,
  "playerId": "...",
  "playerName": "...",
  "color": "...",
  "timestamp": "..."
}

The frontend should update only affected state.

## INITIAL STATE + RECONNECT

Use REST for initial synchronization:

GET /api/game/state

Flow:
REST snapshot → connect WebSocket → receive future events.

If WebSocket disconnects:
1. Reconnect.
2. Resynchronize current state from server.
3. Resume receiving events.

Never assume WebSocket connections are permanent.

## DATABASE

Primary entities:

Player:
- id (UUID)
- username (VARCHAR 30, UNIQUE)
- color (VARCHAR 7)
- createdAt
- lastSeenAt
- cellsClaimed (INT, default 0)
- currentStreak (INT, default 0)

Cell:
- id (BIGSERIAL)
- x (INT)
- y (INT)
- ownerId (UUID FK → players)
- claimedAt (TIMESTAMP)

UNIQUE(x, y) constraint on cells.

Use Flyway for schema migrations. Do not rely on Hibernate auto schema generation for production.

## API

Keep APIs small and purposeful.

REST:
POST /api/players
GET /api/game/state
GET /api/leaderboard
GET /api/players/{id}

WebSocket:
/ws/game

Validate all inputs server-side.

Never trust client-provided ownership, score, color, cooldown state, or leaderboard values.

## GAME RULES

Initial rules:
- Only unowned cells can be claimed.
- Owned cells cannot be claimed again.
- Server controls cooldowns.
- Successful claims increment territory count.
- Leaderboard uses authoritative server-side data.

Keep rules simple and configurable where practical.

## FRONTEND UX

The UI should feel like a polished multiplayer territory game, not a generic CRUD dashboard.

Use:
- dark modern theme
- clear player colors
- subtle grid styling
- smooth claim animations
- hover feedback
- live connection indicator
- leaderboard
- player statistics
- live player count
- loading/error states
- responsive layout
- zoom/pan for the map if practical

The grid is the main visual focus. Avoid clutter.

## PERFORMANCE

Target 50×50 grid (2,500 cells).

Avoid unnecessary React re-renders.

When one cell changes, update only that cell rather than recreating the entire grid state.

Do not prematurely optimize. If the grid becomes much larger, consider virtualization or canvas rendering.

## ERROR HANDLING

Handle:
- duplicate claims
- invalid cells
- invalid players
- malformed WebSocket messages
- WebSocket disconnect/reconnect
- server errors
- database failures

Never silently swallow important errors. Give users clear feedback.

## SECURITY

The backend is authoritative.

Validate: player identity, cell ID, ownership, cooldown/rate limits, request/message format.

Do not expose database internals. Avoid logging sensitive information.

## TESTING

Include:
- service unit tests
- REST API tests
- repository/integration tests
- WebSocket tests
- concurrent claim tests

The concurrent claim test is especially important: many simultaneous requests for one cell must produce exactly one successful claim.

Use Testcontainers for PostgreSQL integration testing where appropriate.

## CODE QUALITY

Prefer: small focused classes, clear naming, constructor dependency injection, immutable DTOs where practical, meaningful exceptions, separation of concerns, centralized error handling.

Avoid: god classes, duplicated logic, magic numbers, unnecessary abstractions, business logic in controllers, frontend-authoritative rules, premature microservices.

## GIT

Use meaningful commits:
feat: add cell claiming
feat: add websocket game events
fix: prevent concurrent cell ownership
test: add concurrent claim integration test
feat: add live leaderboard
ui: polish grid interactions
