# Perspect

**Paste a schema. Get type-safe code.**

Perspect takes any database schema — Prisma, SQL DDL, or plain English — and generates production-quality TypeScript scaffolding: Zod validators, tRPC routes, React forms, and type definitions.

Not toy code. Opinionated, type-safe output that reflects how modern full-stack TypeScript apps should be built.

## How It Works

```
┌──────────────┐     ┌──────────────────┐     ┌───────────────────┐
│  Schema In   │ ──▶ │  Normalize to IR │ ──▶ │  Generate Code    │
│              │     │                  │     │                   │
│ • Prisma     │     │  Deterministic   │     │  LLM + streaming  │
│ • SQL DDL    │     │  parsing for     │     │  with structured  │
│ • English    │     │  Prisma/SQL,     │     │  prompt templates │
│              │     │  LLM for English │     │  per target       │
└──────────────┘     └──────────────────┘     └───────────────────┘
```

**The key architectural decision:** All input formats normalize to a single intermediate representation (IR) before any code generation happens. This means the AI's job is scoped and predictable — it generates code from structured data, not from raw text.

## Stack

- **Next.js 14** (App Router)
- **Vercel AI SDK** — streaming, provider-agnostic (Anthropic / OpenAI)
- **Monaco Editor** — code editing for both input and output
- **Zod** — validation for the app itself _and_ as a generation target (very meta)
- **Radix UI + Tailwind CSS** — accessible, styled components
- **react-resizable-panels** — two-pane layout

## Getting Started

```bash
# Clone and install
git clone https://github.com/ZonaGilreath/perspect.git
cd perspect
npm install

# Configure your AI provider
cp .env.example .env.local
# Edit .env.local with your API key

# Run
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Generation Targets

| Target | Output | Filename |
|--------|--------|----------|
| **Zod** | Validation schemas for create/update/full shapes with transforms | `schemas.ts` |
| **tRPC** | Full CRUD router with cursor-based pagination | `router.ts` |
| **React Forms** | Create/Edit forms with react-hook-form + Zod resolver | `forms.tsx` |
| **Types** | Interfaces, branded IDs, utility types | `types.ts` |

## Configuration

Click the ⚙️ Config button to customize:

- **API Style:** tRPC (default) or REST
- **Form Library:** react-hook-form (default) or native state
- **ORM:** Prisma (default) or Drizzle
- **Comments:** Toggle JSDoc annotations
- **Strict mode:** `z.string().min(1)` for required strings

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── generate/route.ts   # Streaming code generation
│   │   └── parse/route.ts      # Schema normalization
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                # Main app shell
├── components/
│   ├── ConfigDialog.tsx        # Generation preferences
│   ├── Header.tsx
│   ├── OutputPanel.tsx         # Tabbed output with Monaco
│   └── SchemaEditor.tsx        # Input editor with format picker
├── examples/
│   └── index.ts                # Pre-built example schemas
├── lib/
│   ├── ai.ts                   # AI provider config
│   └── utils.ts                # cn() and helpers
├── parsers/
│   ├── index.ts                # Router + format detection
│   ├── prisma.ts               # Deterministic Prisma parser
│   └── sql.ts                  # Deterministic SQL parser
├── prompts/
│   └── index.ts                # Prompt templates per target
└── types/
    └── schema.ts               # Intermediate representation (Zod)
```

## License

MIT
