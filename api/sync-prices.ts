import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

// Vercel Cron Job — runs daily at 00:00 IST (18:30 UTC)
// vercel.json cron: "30 18 * * *"
// Also callable manually: GET /api/sync-prices

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // service role needed to bypass RLS for bulk update
)

async function fetchYahooPrice(symbol: string): Promise<number | null> {
  try {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    if (!r.ok) return null
    const j = await r.json() as { chart?: { result?: { meta?: { regularMarketPrice?: number } }[] } }
    return j.chart?.result?.[0]?.meta?.regularMarketPrice ?? null
  } catch { return null }
}

async function fetchMFNav(schemeCode: string): Promise<number | null> {
  try {
    const r = await fetch(`https://api.mfapi.in/mf/${schemeCode}`)
    if (!r.ok) return null
    const j = await r.json() as { data?: { nav: string }[] }
    const nav = parseFloat(j.data?.[0]?.nav ?? '')
    return isNaN(nav) ? null : nav
  } catch { return null }
}

async function fetchCryptoPrice(coinId: string): Promise<number | null> {
  try {
    const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(coinId)}&vs_currencies=inr`)
    if (!r.ok) return null
    const j = await r.json() as Record<string, { inr?: number }>
    return j[coinId]?.inr ?? null
  } catch { return null }
}

async function fetchMetalPrice(metalKey: string): Promise<number | null> {
  // metalKey: 'gold_gram_inr' | 'silver_gram_inr' | 'platinum_gram_inr'
  // Uses Yahoo Finance commodity futures converted to INR per gram
  const METAL_SYMBOLS: Record<string, { ySymbol: string; gramsPerUnit: number }> = {
    gold_gram_inr:     { ySymbol: 'GC=F',  gramsPerUnit: 31.1035 }, // troy oz
    silver_gram_inr:   { ySymbol: 'SI=F',  gramsPerUnit: 31.1035 },
    platinum_gram_inr: { ySymbol: 'PL=F',  gramsPerUnit: 31.1035 },
  }
  const meta = METAL_SYMBOLS[metalKey]
  if (!meta) return null

  try {
    // Fetch metal price in USD
    const usdPrice = await fetchYahooPrice(meta.ySymbol)
    if (!usdPrice) return null
    // Fetch USD→INR rate
    const fxR = await fetch('https://query2.finance.yahoo.com/v8/finance/chart/USDINR=X?interval=1d&range=1d', { headers: { 'User-Agent': 'Mozilla/5.0' } })
    const fxJ = await fxR.json() as { chart?: { result?: { meta?: { regularMarketPrice?: number } }[] } }
    const usdInr = fxJ.chart?.result?.[0]?.meta?.regularMarketPrice ?? 83.5
    // Convert oz price to per-gram INR
    return parseFloat(((usdPrice * usdInr) / meta.gramsPerUnit).toFixed(2))
  } catch { return null }
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  const { data: assets, error } = await supabase
    .from('assets')
    .select('id, category, ticker, quantity')
    .not('ticker', 'is', null)

  if (error) return res.status(500).json({ error: error.message })
  if (!assets || assets.length === 0) return res.status(200).json({ updated: 0 })

  const now = new Date().toISOString()
  let updated = 0

  for (const asset of assets as { id: string; category: string; ticker: string; quantity: number }[]) {
    let price: number | null = null

    if (asset.category === 'Stock') {
      price = await fetchYahooPrice(asset.ticker)
    } else if (asset.category === 'Mutual Fund') {
      price = await fetchMFNav(asset.ticker)
    } else if (asset.category === 'Crypto') {
      price = await fetchCryptoPrice(asset.ticker)
    } else if (asset.category === 'Precious Metal') {
      price = await fetchMetalPrice(asset.ticker)
    }

    if (price !== null) {
      const newValue = parseFloat((price * (asset.quantity ?? 1)).toFixed(2))
      await supabase
        .from('assets')
        .update({ current_price: price, value: newValue, last_synced: now })
        .eq('id', asset.id)
      updated++
    }

    // Throttle to avoid rate limits
    await new Promise(r => setTimeout(r, 300))
  }

  return res.status(200).json({ updated, total: assets.length, at: now })
}
