import type { Metadata } from "next"
import { Plus_Jakarta_Sans } from "next/font/google"
import "./globals.css"
import { Toaster } from "sonner"

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
})

export const metadata: Metadata = {
  title: "Spell Swap",
  description: "Trade and collect Magic: The Gathering cards on Spell Swap",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${plusJakartaSans.variable} antialiased`}>
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {children}
        </main>
        <Toaster />
      </body>
    </html>
  )
}
