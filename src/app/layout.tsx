import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "MarkIt – Meeting Bingo",
  description: "Rendez vos réunions d'équipe amusantes avec le bingo !",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@700;800&family=Nunito:wght@400;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body bg-gradient-to-br from-purple-50 via-pink-50 to-yellow-50 min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
