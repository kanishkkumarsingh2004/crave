# ⚡ BlinkBite — Admin Console

A fast, modern **Admin Operations Console** for BlinkBite built with **Next.js 15 (App Router)**, **TypeScript**, **Tailwind CSS**, and **Lucide Icons**.

Features a zero-dependency, self-contained mock database with persistence to local JSON, providing a complete operations panel out-of-the-box without requiring an external PostgreSQL instance.

---

## 🚀 Key Features

- **Dashboard & KPIs**: Live operations metrics, order volume breakdown, revenue summaries, and quick action queues.
- **Vendors Management**: Store directory, onboarding approvals, status toggling (Active, Suspended, Rejected), and store search.
- **Orders Control**: Live order tracking across lifecycle states (`PENDING` → `CONFIRMED` → `PREPARING` → `READY_FOR_PICKUP` → `OUT_FOR_DELIVERY` → `DELIVERED`).
- **Product Catalog**: Global item catalog, pricing, SKU tracking, vendor filtering, and stock status management.
- **Category Hierarchy**: Category taxonomy management, active status flags, display order configuration.
- **Fleet & Drivers**: Driver roster, onboarding approvals, availability monitoring, vehicle & license tracking.
- **Customer Directory**: Customer profiles, order histories, status controls (Active, Suspended, Deactivated).
- **Payments & Refunds**: Real-time transaction inspection, refund management with manual review, approval, and rejection.
- **Platform Settings**: Configurable delivery fees, tax rates, commission rules, and cancellation windows.
- **Audit Logs**: Immutable timeline recording administrative actions and entity modifications.
- **Built-in Mock Database**: In-memory Prisma-compatible store with automatic JSON file persistence (`./data/db.json`).
- **Standardized Auth**: Secure session management and demo admin account pre-configured.

---

## 🛠 Tech Stack

- **Framework**: [Next.js 15 (App Router)](https://nextjs.org/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Components**: [Radix UI primitives](https://www.radix-ui.com/) & [Lucide Icons](https://lucide.dev/)
- **Validation**: [Zod](https://zod.dev/)
- **Database / Store**: Embedded In-Memory Store with JSON persistence (`lib/db/`)

---

## 📁 Project Structure

```text
├── app/
│   ├── (auth)/
│   │   └── login/             # Admin sign-in screen
│   ├── (dashboard)/
│   │   ├── audit-logs/        # System audit log viewer
│   │   ├── categories/        # Catalog categories
│   │   ├── customers/         # Customer profiles & order history
│   │   ├── dashboard/         # Operations overview & metrics
│   │   ├── drivers/           # Driver roster & onboarding
│   │   ├── orders/            # Live order board & details
│   │   ├── payments/          # Payment transactions & settlements
│   │   ├── products/          # Product catalog management
│   │   ├── refunds/           # Refund review & approval
│   │   ├── reviews/           # Customer rating & reviews
│   │   ├── settings/          # System configuration
│   │   └── vendors/           # Vendor directory & approvals
│   ├── api/v1/
│   │   ├── admin/             # Secure Admin REST API endpoints
│   │   ├── auth/              # Admin login & session verification
│   │   └── health/            # System healthcheck endpoint
│   ├── layout.tsx             # Root layout & providers
│   ├── page.tsx               # Root landing / redirect page
│   └── globals.css            # Tailored styling & design tokens
├── components/
│   ├── dashboard/             # Navigation sidebar, topbar & widgets
│   ├── shared/                # Data tables, status badges & modal dialogs
│   └── ui/                    # Reusable UI primitives (buttons, inputs, cards)
├── data/                      # Local JSON database & file storage
├── lib/
│   ├── auth/                  # Scrypt authentication & session cookies
│   ├── constants/             # Central system constants & error codes
│   ├── db/                    # In-memory typed Prisma-compatible data store
│   ├── server/                # API response wrappers & route helpers
│   ├── utils.ts               # Core utility functions
│   └── validation/            # Zod validation schemas
└── types/                     # Shared TypeScript domain models & API envelopes
```

---

## ⚡ Getting Started

### 1. Prerequisites

- **Node.js** >= 18.17.0
- **pnpm** >= 9 (or npm / yarn)

### 2. Installation

```bash
# Clone the repository
git clone https://github.com/kanishkkumarsingh2004/Blinkbite.git
cd Blinkbite

# Install dependencies
pnpm install
```

### 3. Environment Setup

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

*(No external database installation required — data initializes in `./data/db.json` automatically).*

### 4. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Demo Credentials

| Role | Email | Password |
| :--- | :--- | :--- |
| **System Admin** | `admin@delivery.com` | `Password123` |

---

## 🧪 Available Scripts

| Command | Description |
| :--- | :--- |
| `pnpm dev` | Starts the Next.js development server on port 3000 |
| `pnpm build` | Builds the production bundle |
| `pnpm start` | Starts the production server |
| `pnpm lint` | Runs ESLint validation |
| `pnpm typecheck` | Runs TypeScript compiler checks (`tsc --noEmit`) |

---

## 🔒 Security & Access

- All `/api/v1/admin/*` endpoints strictly require an active `ADMIN` session cookie.
- Unauthenticated or non-admin requests receive `401 Unauthorized` / `403 Forbidden`.
- Middleware automatically redirects unauthenticated users visiting dashboard routes to `/login`.
