import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TeamForge IDE — Autonomous AI Development",
  description: "An autonomous IDE where AI agents collaborate to build software 24/7.",
  keywords: ["TeamForge", "IDE", "AI Agents", "Next.js", "TypeScript", "Autonomous Development"],
  authors: [{ name: "TeamForge" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "TeamForge IDE — Autonomous AI Development",
    description: "An autonomous IDE where AI agents collaborate to build software 24/7",
    url: "https://chat.z.ai",
    siteName: "TeamForge IDE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TeamForge IDE — Autonomous AI Development",
    description: "An autonomous IDE where AI agents collaborate to build software 24/7",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
