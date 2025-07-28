import type { Metadata } from 'next'
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
  themeColor: '#0066cc',
  viewport: 'width=device-width, initial-scale=1, shrink-to-fit=no',
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