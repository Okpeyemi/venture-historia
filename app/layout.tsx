import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Venture Historia",
  description: "Sim entrepreneurial narratif long format",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-neutral-950 text-neutral-100 antialiased">
        {children}
      </body>
    </html>
  );
}
