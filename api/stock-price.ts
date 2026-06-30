import type { VercelRequest, VercelResponse } from '@vercel/node'

// GET /api/stock-price?symbol=RELIANCE.NS
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const symbol = (req.query.symbol as string ?? '').trim()
  if (!symbol) return res.status(400).json({ error: 'symbol required' })

  try {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`
    const upstream = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    if (!upstream.ok) throw new Error(`Yahoo returned ${upstream.status}`)
    const json = await upstream.json() as {
      chart?: { result?: { meta?: { regularMarketPrice?: number; currency?: string } }[] }
    }
    const meta = json.chart?.result?.[0]?.meta
    if (!meta?.regularMarketPrice) return res.status(404).json({ error: 'price not found' })
    return res.status(200).json({ price: meta.regularMarketPrice, currency: meta.currency ?? 'INR' })
  } catch (e) {
    return res.status(500).json({ error: String(e) })
  }
}
