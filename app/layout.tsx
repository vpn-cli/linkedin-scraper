export const metadata = {
  title: 'Hiring Challenge API API',
  description: 'Generic scraper API infrastructure',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
