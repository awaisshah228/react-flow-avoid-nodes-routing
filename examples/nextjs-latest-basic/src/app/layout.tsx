import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Avoid Nodes Edge — Next.js Example",
  description: "Smart orthogonal edge routing for React Flow with Next.js",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
