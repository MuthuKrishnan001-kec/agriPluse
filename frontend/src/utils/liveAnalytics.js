export function parseNumericValue(value) {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string') {
    const cleaned = value.replace(/,/g, '').trim()
    if (!cleaned) return null
    const parsed = Number(cleaned)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

export function buildDistrictLeaderboard(rows = []) {
  const groups = new Map()
  rows.forEach((row) => {
    const district = String(row?.district_name || '').trim()
    if (!district) return
    const current = groups.get(district) || { district_name: district, total_output_tons: 0, cultivated_ha: 0, avg_yield: 0, count: 0 }
    const production = parseNumericValue(row?.production) ?? 0
    const area = parseNumericValue(row?.area) ?? 0
    const yieldValue = parseNumericValue(row?.yield)
    current.total_output_tons += production
    current.cultivated_ha += area
    current.avg_yield = ((current.avg_yield * current.count) + (yieldValue ?? 0)) / (current.count + 1)
    current.count += 1
    groups.set(district, current)
  })

  return Array.from(groups.values())
    .map((item) => ({
      ...item,
      yield_rate: item.count ? item.avg_yield : 0,
    }))
    .sort((a, b) => b.total_output_tons - a.total_output_tons)
}

export function buildSoilTypeBreakdown(rows = []) {
  const counts = new Map()
  rows.forEach((row) => {
    const soil = String(row?.soil_type || '').trim()
    if (!soil) return
    counts.set(soil, (counts.get(soil) || 0) + 1)
  })
  return Array.from(counts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

export function buildYearTrend(rows = [], valueKey, yearKey = 'year') {
  const groups = new Map()
  rows.forEach((row) => {
    const yearValue = row?.[yearKey]
    const year = yearValue === null || yearValue === undefined || yearValue === '' ? null : String(yearValue)
    if (!year) return
    const parsedValue = parseNumericValue(row?.[valueKey])
    if (parsedValue === null) return
    const current = groups.get(year) || { year, total: 0, count: 0 }
    current.total += parsedValue
    current.count += 1
    groups.set(year, current)
  })

  return Array.from(groups.values())
    .map((item) => ({
      year: item.year,
      value: item.count ? item.total / item.count : 0,
    }))
    .sort((a, b) => String(a.year).localeCompare(String(b.year), undefined, { numeric: true }))
}

export function buildRainfallYieldTrend(rows = []) {
  const groups = new Map()
  rows.forEach((row) => {
    const yearValue = row?.year
    const year = yearValue === null || yearValue === undefined || yearValue === '' ? null : String(yearValue)
    if (!year) return
    const rainfall = parseNumericValue(row?.rainfall)
    const yieldValue = parseNumericValue(row?.yield)
    if (rainfall === null && yieldValue === null) return
    const current = groups.get(year) || { year, rainfall: 0, yield: 0, count: 0 }
    if (rainfall !== null) current.rainfall += rainfall
    if (yieldValue !== null) current.yield += yieldValue
    current.count += 1
    groups.set(year, current)
  })

  return Array.from(groups.values())
    .map((item) => ({
      year: item.year,
      rainfall: item.count ? item.rainfall / item.count : 0,
      yield: item.count ? item.yield / item.count : 0,
    }))
    .sort((a, b) => String(a.year).localeCompare(String(b.year), undefined, { numeric: true }))
}

export function buildCropBreakdown(rows = []) {
  const groups = new Map()
  rows.forEach((row) => {
    const crop = String(row?.crop || '').trim()
    if (!crop) return
    const current = groups.get(crop) || { crop, value: 0, count: 0 }
    const amount = parseNumericValue(row?.production) ?? parseNumericValue(row?.yield) ?? 0
    current.value += amount
    current.count += 1
    groups.set(crop, current)
  })
  return Array.from(groups.values()).sort((a, b) => b.value - a.value)
}
