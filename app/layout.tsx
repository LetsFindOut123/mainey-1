import './globals.css'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'

export const metadata = { title: 'Mainey', description: 'Creative Ecosystem Hub' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-black text-white min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow max-w-7xl mx-auto p-4">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
