import type { Metadata } from "next"
import { Inter, Noto_Sans_Thai } from "next/font/google"
import { AppShell } from "@/components/app/app-shell"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import "./globals.css"

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] })
const thai = Noto_Sans_Thai({ variable: "--font-thai", subsets: ["thai"] })

export const metadata: Metadata = {
  title: "NockERP v2 · Prototype",
  description: "NockERP prototype rebuilt from the staging test findings",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={`${inter.variable} ${thai.variable} h-full antialiased`}>
      <body className="min-h-full" style={{ fontFamily: "var(--font-inter), var(--font-thai), system-ui, sans-serif" }}>
        <TooltipProvider>
          <AppShell>{children}</AppShell>
          <Toaster position="bottom-right" richColors closeButton duration={6000} />
        </TooltipProvider>
      </body>
    </html>
  )
}
