import type React from "react"
import { Inter } from "next/font/google"
import "./globals.css"
import "leaflet/dist/leaflet.css"
import { ThemeProvider } from "@/components/theme-provider"
import Script from "next/script"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "City 311 Service Request System",
  description: "AI-powered 311 service request system for city services",
  generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Load Leaflet first, then the heatmap plugin */}
        <Script 
          src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" 
          strategy="beforeInteractive"
          crossOrigin="anonymous"
        />
        <Script 
          src="https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js" 
          strategy="afterInteractive"
          crossOrigin="anonymous"
        />
      </head>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
