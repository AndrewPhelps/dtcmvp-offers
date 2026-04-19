import type { Metadata } from 'next'
import { Inter, Space_Grotesk, Space_Mono } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
})

const spaceMono = Space_Mono({
  subsets: ['latin'],
  variable: '--font-space-mono',
  weight: ['400', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'roi carwash | dtcmvp',
  description: 'Transform Shopify app ROI sheets into branded dtcmvp listings',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable} ${spaceMono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
