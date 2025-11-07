import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { ClientProvider } from "@/components/providers/ClientProvider";
import { Toaster } from "@/components/ui/sonner";
import { AppLoader } from "@/components/ui/app-loader";

// Force dynamic rendering for all pages
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

const interHeading = Inter({
  weight: ["500", "600", "700"],
  variable: "--font-heading",
  subsets: ["latin"],
});

const interBody = Inter({
  weight: ["400", "500"],
  variable: "--font-body",
  subsets: ["latin"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "b0t - Build Custom Automations",
  description: "Visual automation platform for building custom workflows. Connect APIs, services, and platforms to create powerful automations.",
  icons: {
    icon: '/bot-icon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body
        className={`${interHeading.variable} ${interBody.variable} ${inter.variable} antialiased`}
      >
        <AppLoader />
        <SessionProvider>
          <ClientProvider>
            {children}
          </ClientProvider>
        </SessionProvider>
        <Toaster />
      </body>
    </html>
  );
}
