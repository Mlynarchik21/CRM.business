import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Studio CRM",
  description: "CRM-система для digital-студии",
};

// Шрифт — системный стек (Tailwind font-sans). Не зависит от Google Fonts при
// сборке, поэтому деплой не падает из-за сетевых сбоев к fonts.gstatic.com.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
        <Toaster theme="dark" position="top-right" richColors />
      </body>
    </html>
  );
}
