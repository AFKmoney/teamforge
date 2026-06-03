import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
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
  title: "EvoAI — Self-Evolving AI System",
  description: "A production-grade self-evolving AI platform that autonomously improves its capabilities through validated experimentation.",
  keywords: ["EvoAI", "Self-Evolving AI", "Next.js", "TypeScript", "Tailwind CSS", "shadcn/ui", "AI agents", "Evolution Engine"],
  authors: [{ name: "EvoAI Team" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "EvoAI — Self-Evolving AI System",
    description: "A self-evolving AI platform that autonomously improves its capabilities",
    url: "https://chat.z.ai",
    siteName: "EvoAI",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "EvoAI — Self-Evolving AI System",
    description: "A self-evolving AI platform that autonomously improves its capabilities",
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
          defaultTheme="system"
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
