import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HeliXpert — AI-Powered Helicopter Intelligence Platform",
  description:
    "Multimodal AI assistant and intelligence platform for structured helicopter datasets and airframe vision inspection. Intelligent Insights. Powered by Data.",
  keywords: [
    "HeliXpert",
    "Helicopter Intelligence",
    "HAL",
    "Aerospace AI",
    "DuckDB",
    "Text-to-SQL",
    "Aviation Analytics",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('helixpert-theme') || 'light';
                  document.documentElement.classList.toggle('dark', theme === 'dark');
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen antialiased selection:bg-purple-500/20 selection:text-purple-700 dark:selection:text-purple-300">
        {children}
      </body>
    </html>
  );
}
