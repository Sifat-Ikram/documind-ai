import type { Metadata } from "next";
import { Inter, Noto_Sans_Bengali } from "next/font/google";
import "./globals.css";
import { AppToaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/context/auth-context";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const bengali = Noto_Sans_Bengali({
  subsets: ["bengali"],
  variable: "--font-bengali",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "DocuMind AI", template: "%s | DocuMind AI" },
  description: "AI-powered document analysis.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${bengali.variable}`}>
      <body suppressHydrationWarning>
        <AuthProvider>{children}</AuthProvider>
        <AppToaster />
      </body>
    </html>
  );
}
