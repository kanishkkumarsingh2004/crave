# Crave — Food Delivery Platform

A full-stack food delivery platform built with **Next.js 16**, **Prisma ORM**, **PostgreSQL**, and **WebSocket** for real-time order tracking, driver location updates, and admin payment approval workflows.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Docker Compose                      │
│                                                         │
│  ┌───────────────┐       ┌───────────────┐    ┌──────┐  │
│  │   Frontend    │  HTTP │   Backend     │    │  DB  │  │
│  │  (Next.js)    │       │ (WebSocket)   │    │  PG  │  │
│  │  port 3000    │       │  port 8000    │    │ 5432 │  │
│  └──────┬────────┘       └──────┬────────┘    └──▲───┘  │
│         │ WebSocket connect      │  API routes call     │
│         └────────────────────────┼─broadcast endpoint──┘
│         (ws://host:8000/ws)      │                      │
│                                  │                      │
└─────────────────────────────────┼──────────────────────┘
                                  │
                                  ▼
                    Broadcast via HTTP POST to
                    backend:8000/__ws/broadcast
```

### Services

| Service    | Port | Description                                              |
|------------|------|----------------------------------------------------------|
| Frontend   | 3000 | Next.js app (React pages, API routes, static assets)     |
| Backend    | 8000 | WebSocket server (real-time broadcasts, WS connections) |
| PostgreSQL | 5432 | Database for all application data                         |

### Key Files

- **`server.js`** — Frontend HTTP server (Next.js App Router)
- **`ws-server.js`** — Standalone WebSocket backend server (port 8000)
- **`lib/ws-server.ts`** — Broadcast helper — API routes call this to push WS messages to backend
- **`lib/websocket.tsx`** — Client-side React hooks (`useWebSocket`, `useOrderUpdates`, `useDriverLocation`, `useApprovalUpdates`)
- **`lib/dal/`** — Data Access Layer (Prisma + Supabase fallback)
- **`app/api/`** — API route handlers

## Prerequisites

- [Node.js 20+](https://nodejs.org/)
- [pnpm 9+](https://pnpm.io/)
- [Docker & Docker Compose](https://docs.docker.com/compose/) (for containerized setup)

## Quick Start (Docker)

```bash
# Start all services
docker-compose up --build

# The application will be available at:
#   Frontend:  http://localhost:3000
#   WebSocket: ws://localhost:8000/api/ws
#   Database:  localhost:5432
```

### Environment Variables

Create a `.env` file from the template:

```bash
cp .env.example .env
```

Key variables:

| Variable               | Default                          | Description                          |
|------------------------|----------------------------------|--------------------------------------|
| `DATABASE_URL`         | `postgresql://crave:crave_secret@postgres:5432/crave_db?schema=public` | PostgreSQL connection string |
| `JWT_SECRET`           | *(random)*                       | JWT signing secret                   |
| `WS_PORT`              | `8000`                           | WebSocket server port                |
| `WS_BROADCAST_PORT`    | `8000`                           | Port for API routes to broadcast to  |
| `WS_BROADCAST_HOST`    | `localhost`                      | Host for API routes to broadcast to  |
| `NEXT_PUBLIC_WS_PORT`  | `8000`                           | Client-side WS port                  |
| `NEXT_PUBLIC_WS_HOST`  | `localhost`                      | Client-side WS host                  |

## Local Development (without Docker)

```bash
# 1. Install dependencies
pnpm install

# 2. Set up database (requires PostgreSQL running locally)
pnpm prisma db push
pnpm prisma db seed

# 3. Start the frontend server (port 3000)
pnpm dev

# 4. In a separate terminal, start the WebSocket backend (port 8000)
WS_PORT=8000 node ws-server.js

# 5. Open http://localhost:3000
```

## Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

The test suite uses **Jest** with **Babel** for TypeScript transformation and **Testing Library** for React component testing. WebSocket hooks are tested using mocked `WebSocket` globals and the existing test infrastructure handles jose JWT mocks, Prisma DAL mocks, and Supabase fallbacks.

## Project Structure

```
.
├── app/                 # Next.js App Router
│   ├── api/             # API routes
│   │   ├── admin/       # Admin endpoints (payment reviews, users, stats)
│   │   ├── auth/        # Authentication endpoints
│   │   ├── orders/      # Order management
│   │   ├── restaurants/ # Restaurant endpoints
│   │   └── health/      # Health check endpoint
│   ├── admin/           # Admin pages
│   ├── user/            # Customer pages
│   └── layout.tsx       # Root layout
├── components/          # React components
│   ├── dashboards/      # Dashboard views (Customer, Vendor, Admin)
│   ├── ui/             # Reusable UI components
│   └── ...
├── lib/                 # Core libraries
│   ├── dal/            # Data Access Layer
│   ├── prisma.ts       # Prisma client
│   ├── supabase.ts     # Supabase client (disabled — using local PostgreSQL)
│   ├── jwt.ts          # JWT utilities (jose library)
│   ├── ws-server.ts    # Broadcast helper
│   ├── websocket.tsx   # WebSocket React hooks
│   ├── auth-context.tsx # Auth context/provider
│   └── ...
├── prisma/              # Database schema & migrations
│   ├── schema.prisma   # Prisma schema
│   └── seed.ts         # Database seeder
├── test/                # Test files
│   ├── api/            # API route tests
│   ├── components/     # Component tests
│   ├── dal/            # Data Access Layer tests
│   ├── __mocks__/      # Shared test mocks
│   └── setup.ts        # Global test setup
├── server.js            # Frontend HTTP server entry point
├── ws-server.js         # WebSocket backend server entry point
├── Dockerfile           # Docker build definition
├── docker-compose.yml   # Multi-service orchestration
├── babel.config.js      # Babel configuration
├── jest.config.js       # Jest configuration
├── next.config.mjs      # Next.js configuration
└── package.json
```

## Features

### Real-time Order Tracking
- WebSocket connections for live order status updates
- Driver location tracking with real-time position updates
- Order status progression visualization (Confirmed → Cooking → Out for Delivery → Delivered)

### Payment Verification Workflow
- UPI payment reference (UTR) submission
- Admin approval/rejection of payments via WebSocket broadcasts
- Real-time payment status updates to customers

### Multi-role Dashboards
- **Customer**: Order placement, live tracking, order history
- **Vendor/Restaurant**: Kitchen order management, order status updates
- **Admin**: Payment review queue, user management, analytics
- **Rider**: Order assignment, delivery tracking

### API Design
- RESTful API routes with JWT authentication
- Role-based access control (user, restaurant_vendor, rider, admin)
- Prisma ORM with PostgreSQL backend

## License

Private — all rights reserved.
