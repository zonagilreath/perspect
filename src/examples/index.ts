export interface ExampleSchema {
  label: string;
  description: string;
  format: "prisma" | "sql" | "english";
  content: string;
}

export const EXAMPLE_SCHEMAS: ExampleSchema[] = [
  {
    label: "Blog Platform",
    description: "Users, posts, comments, and tags",
    format: "prisma",
    content: `model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  bio       String?
  avatarUrl String?
  role      Role     @default(AUTHOR)
  posts     Post[]
  comments  Comment[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Post {
  id          String    @id @default(cuid())
  title       String
  slug        String    @unique
  content     String
  excerpt     String?
  published   Boolean   @default(false)
  publishedAt DateTime?
  author      User      @relation(fields: [authorId], references: [id])
  authorId    String
  comments    Comment[]
  tags        Tag[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

model Comment {
  id        String   @id @default(cuid())
  body      String
  author    User     @relation(fields: [authorId], references: [id])
  authorId  String
  post      Post     @relation(fields: [postId], references: [id])
  postId    String
  createdAt DateTime @default(now())
}

model Tag {
  id    String @id @default(cuid())
  name  String @unique
  slug  String @unique
  posts Post[]
}

enum Role {
  ADMIN
  EDITOR
  AUTHOR
}`,
  },
  {
    label: "E-Commerce",
    description: "Products, orders, and customers (SQL)",
    format: "sql",
    content: `CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled');

CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  sku VARCHAR(100) UNIQUE,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  status order_status NOT NULL DEFAULT 'pending',
  total_amount DECIMAL(10, 2) NOT NULL,
  shipping_address TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);`,
  },
  {
    label: "SaaS Multi-Tenant",
    description: "Orgs, members, projects (plain English)",
    format: "english",
    content: `A multi-tenant SaaS application with:

- Organizations that have a name, slug (unique), and a subscription plan (free, pro, or enterprise)
- Users with email, name, and avatar URL
- Organization memberships linking users to orgs, with roles: owner, admin, or member
- Projects belonging to an organization, with a name, description, status (active, archived, completed), and an optional due date
- Tasks within projects, having a title, description, priority (low, medium, high, urgent), status (todo, in_progress, in_review, done), and assigned to a user`,
  },
];
