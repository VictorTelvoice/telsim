import type { Metadata, Viewport } from "next";
import { Manrope, Inter, Montserrat, Space_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

const spaceMono = Space_Mono({
  weight: ["400", "700"],
  variable: "--font-space-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#1B3A8A",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Telsim | Infraestructura de números reales para agentes de IA",
  description: "Telsim ofrece infraestructura de números reales para agentes de IA, automatización y validación SMS. Opera OTP, webhooks, API y bots con una capa confiable de identidad telefónica.",
  openGraph: {
    title: "Telsim | Infraestructura de números reales para agentes de IA",
    description: "Infraestructura de números reales para agentes de IA, automatización y validación SMS. Opera OTP, API, webhooks y bots sobre una capa confiable de identidad telefónica.",
    url: "https://telsim.io",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Telsim",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${manrope.variable} ${inter.variable} ${montserrat.variable} ${spaceMono.variable} h-full`}
    >
      <head>
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Round" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />
      </head>
      <body className="min-h-full font-manrope antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
 
