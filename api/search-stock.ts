import type { VercelRequest, VercelResponse } from '@vercel/node'

// Vercel serverless function — proxies Yahoo Finance search
// so browser CORS restrictions are bypassed.
// GET /api/search-stock?q=Reliance
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const q = (req.query.q as string ?? '').trim()
  if (!q || q.length < 2) return res.status(400).json({ error: 'query too short' })

  try {
    const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&lang=en-IN&region=IN&quotesCount=8&newsCount=0&listsCount=0`
    const upstream = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
    if (!upstream.ok) throw new Error(`Yahoo returned ${upstream.status}`)
    const json = await upstream.json() as {
      quotes?: { symbol: string; shortname?: string; longname?: string; exchDisp?: string; typeDisp?: string }[]
    }

    const quotes = (json.quotes ?? [])
      .filter(q => q.typeDisp === 'Equity' && (q.symbol.endsWith('.NS') || q.symbol.endsWith('.BO')))
      .slice(0, 8)
      .map(q => ({
        symbol:   q.symbol,
        name:     q.shortname ?? q.longname ?? q.symbol,
        exchange: q.exchDisp ?? (q.symbol.endsWith('.NS') ? 'NSE' : 'BSE'),
      }))

    return res.status(200).json({ results: quotes })
  } catch (e) {
    return res.status(500).json({ error: String(e) })
  }
}
