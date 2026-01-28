import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { FlowsProvider } from "@/context/FlowsContext";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Onchain Flows - Live Crypto Intelligence",
  description: "Track live onchain flows, whale movements, DeFi activities, and smart money moves across Solana, Ethereum, and Base. Share instantly on Twitter.",
  keywords: ["crypto", "blockchain", "onchain", "whale", "defi", "solana", "ethereum", "base"],
  openGraph: {
    title: "Onchain Flows - Live Crypto Intelligence",
    description: "Track live onchain flows and share them on Twitter",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Onchain Flows",
    description: "Track live onchain flows and share them on Twitter",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <FlowsProvider>{children}</FlowsProvider>
      </body>
    </html>
  );
}
