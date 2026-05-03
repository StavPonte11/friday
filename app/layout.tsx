/**
 * Root layout — required by Next.js 15 when using locale-based routing.
 * The actual <html>/<body> structure is handled inside [locale]/layout.tsx.
 * This file exists solely so Next.js can locate a root layout for pages
 * that sit at the app/ root level, like not-found.tsx.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
