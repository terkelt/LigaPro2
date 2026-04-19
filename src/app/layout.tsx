import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { NavigationProgress } from "@/components/layout/NavigationProgress";

export const metadata: Metadata = {
  title: "Liga Pro Fußballmanager",
  description: "Der ultimative Fußballmanager mit realen Daten der ersten drei deutschen Ligen",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body className="min-h-screen" suppressHydrationWarning>
        <NavigationProgress />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
