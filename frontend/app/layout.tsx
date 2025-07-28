import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import '../styles/accessibility.css'
import { ApolloWrapper } from '@/lib/apollo-provider'
import ServiceWorkerProvider from '@/components/ServiceWorkerProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Geulpi Calendar',
  description: 'Smart calendar service with AI-powered scheduling',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Geulpi Calendar',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: 'Geulpi Calendar',
    title: 'Geulpi Calendar',
    description: 'Smart calendar service with AI-powered scheduling',
  },
  twitter: {
    card: 'summary',
    title: 'Geulpi Calendar',
    description: 'Smart calendar service with AI-powered scheduling',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0066cc',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <ApolloWrapper>
          <ServiceWorkerProvider>
            {children}
          </ServiceWorkerProvider>
        </ApolloWrapper>
      </body>
    </html>
  )
}