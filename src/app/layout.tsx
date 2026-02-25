import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Perspect — Type-Safe Code Generation from Any Schema",
  description:
    "Paste a Prisma schema, SQL DDL, or plain English description and generate Zod validators, tRPC routes, React forms, and TypeScript types.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="noise-bg min-h-screen overflow-hidden">
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
