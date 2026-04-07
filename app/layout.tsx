import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Kit Store Builder — Crie sua loja de camisas de time",
  description:
    "Painel para configurar e publicar automaticamente lojas de camisas de futebol no Wix, com conteúdo gerado por IA.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased bg-zinc-950 text-white min-h-screen`}>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
