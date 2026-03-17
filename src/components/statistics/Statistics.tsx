import { memo, useMemo } from 'react'
import { GrillEvent, GrillItem } from '../../types'
import { formatDateGerman, formatCurrency } from '../../utils/format'
import { getItemEmoji } from '../../utils/emoji'
import './Statistics.css'

interface StatisticsProps {
  events: GrillEvent[]
  onBack: () => void
  onSelectPerson: (name: string) => void
}

const AVATAR_COLORS = [
  '#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#1abc9c',
  '#3498db', '#9b59b6', '#e91e63', '#00bcd4', '#ff5722',
]

const CHART_COLORS = [
  '#ff8c42', '#3498db', '#2ecc71', '#e74c3c', '#9b59b6',
  '#f1c40f', '#1abc9c', '#e91e63', '#00bcd4', '#ff5722',
]

function getAvatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function getInitials(name: string): string {
  if (name.toLowerCase() === 'ich') return 'DR'
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function getItemTotal(event: GrillEvent, itemId: string): number {
  return (event.orders ?? [])
    .filter((o) => o.itemId === itemId)
    .reduce((sum, o) => sum + o.quantity, 0)
}

function getUnitPrice(event: GrillEvent, item: GrillItem): number {
  const total = getItemTotal(event, item.id)
  if (total === 0) return item.totalPrice > 0 ? item.totalPrice : 0
  return item.totalPrice / total
}

function getPersonCost(event: GrillEvent, personId: string): number {
  return (event.items ?? []).reduce((sum, item) => {
    const qty = (event.orders ?? []).find(
      (o) => o.personId === personId && o.itemId === item.id
    )?.quantity ?? 0
    return sum + qty * getUnitPrice(event, item)
  }, 0)
}

function isMe(name: string): boolean {
  return name.toLowerCase() === 'ich'
}

function getEventTotalCharged(event: GrillEvent): number {
  return (event.persons ?? []).reduce((sum, p) => {
    if (isMe(p.name)) return sum
    return sum + ((event.billing ?? []).find((b) => b.personId === p.id)?.charged ?? 0)
  }, 0)
}

function getEventTotalCosts(event: GrillEvent): number {
  return (event.persons ?? []).reduce((sum, p) => sum + getPersonCost(event, p.id), 0)
}

export const Statistics = memo(function Statistics({ events, onBack, onSelectPerson }: StatisticsProps) {
  const stats = useMemo(() => {
    const chronological = [...events]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    // Costs per event
    const costsPerEvent = chronological
      .map((ev) => ({
        name: ev.name,
        date: ev.date,
        total: getEventTotalCosts(ev),
        myCost: getEventTotalCosts(ev) - getEventTotalCharged(ev),
      }))
      .filter((e) => e.total > 0)

    // Top spenders
    const spenderMap = new Map<string, number>()
    for (const ev of events) {
      for (const p of ev.persons ?? []) {
        const cost = getPersonCost(ev, p.id)
        if (cost > 0) {
          spenderMap.set(p.name, (spenderMap.get(p.name) ?? 0) + cost)
        }
      }
    }
    const topSpenders = [...spenderMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)

    // All items count
    const itemCountMap = new Map<string, number>()
    for (const ev of events) {
      for (const order of ev.orders ?? []) {
        const item = (ev.items ?? []).find((i) => i.id === order.itemId)
        if (item) {
          itemCountMap.set(item.name, (itemCountMap.get(item.name) ?? 0) + order.quantity)
        }
      }
    }
    const allItems = [...itemCountMap.entries()].sort((a, b) => b[1] - a[1])

    // Price history per item across events (unit price)
    const itemNames = new Set<string>()
    for (const ev of chronological) {
      for (const item of ev.items ?? []) {
        if (item.totalPrice > 0) itemNames.add(item.name)
      }
    }

    const priceHistory: {
      itemName: string
      dataPoints: { eventName: string; date: string; unitPrice: number; totalPrice: number }[]
    }[] = []

    for (const itemName of itemNames) {
      const dataPoints: { eventName: string; date: string; unitPrice: number; totalPrice: number }[] = []
      for (const ev of chronological) {
        const item = ev.items.find((i) => i.name === itemName)
        if (item && item.totalPrice > 0) {
          dataPoints.push({
            eventName: ev.name,
            date: ev.date,
            unitPrice: getUnitPrice(ev, item),
            totalPrice: item.totalPrice,
          })
        }
      }
      if (dataPoints.length >= 1) {
        priceHistory.push({ itemName, dataPoints })
      }
    }

    // Sort: items with most data points first
    priceHistory.sort((a, b) => b.dataPoints.length - a.dataPoints.length)

    // Average cost per person
    let totalPersonEvents = 0
    let totalPersonCosts = 0
    for (const ev of events) {
      for (const p of ev.persons ?? []) {
        const cost = getPersonCost(ev, p.id)
        if (cost > 0) {
          totalPersonEvents++
          totalPersonCosts += cost
        }
      }
    }
    const avgCostPerPerson = totalPersonEvents > 0 ? totalPersonCosts / totalPersonEvents : 0

    const totalCostsAll = events.reduce((sum, ev) => sum + getEventTotalCosts(ev), 0)
    const totalMyCosts = events.reduce((sum, ev) => {
      return sum + (getEventTotalCosts(ev) - getEventTotalCharged(ev))
    }, 0)

    // Season review per year
    const yearMap = new Map<string, GrillEvent[]>()
    for (const ev of events) {
      const year = ev.date.slice(0, 4)
      if (!yearMap.has(year)) yearMap.set(year, [])
      yearMap.get(year)!.push(ev)
    }

    const seasons = [...yearMap.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([year, evs]) => {
        const eventCount = evs.length
        const totalCost = evs.reduce((s, ev) => s + getEventTotalCosts(ev), 0)
        const myCost = evs.reduce((s, ev) => s + (getEventTotalCosts(ev) - getEventTotalCharged(ev)), 0)
        const personSet = new Set<string>()
        for (const ev of evs) {
          for (const p of ev.persons ?? []) personSet.add(p.name)
        }

        // Total items ordered
        const itemCounts = new Map<string, number>()
        let totalItemsOrdered = 0
        for (const ev of evs) {
          for (const order of ev.orders ?? []) {
            const item = (ev.items ?? []).find((i) => i.id === order.itemId)
            if (item) {
              itemCounts.set(item.name, (itemCounts.get(item.name) ?? 0) + order.quantity)
              totalItemsOrdered += order.quantity
            }
          }
        }

        // Top item
        let topItem = ''
        let topItemCount = 0
        for (const [name, count] of itemCounts) {
          if (count > topItemCount) {
            topItem = name
            topItemCount = count
          }
        }

        return { year, eventCount, totalCost, myCost, personCount: personSet.size, totalItemsOrdered, topItem, topItemCount }
      })

    return { costsPerEvent, topSpenders, allItems, priceHistory, avgCostPerPerson, totalCostsAll, totalMyCosts, seasons }
  }, [events])

  return (
    <div className="statistics">
      <div className="statistics-header">
        <button className="btn btn-secondary" onClick={onBack}>
          Zurück
        </button>
        <h2>Statistiken</h2>
      </div>

      {/* Hero Stats */}
      <div className="hero-stats">
        <div className="hero-stat">
          <span className="hero-stat-value">{formatCurrency(stats.totalCostsAll)}</span>
          <span className="hero-stat-label">Gesamtkosten</span>
        </div>
        <div className="hero-stat-divider" />
        <div className="hero-stat">
          <span className="hero-stat-value">{formatCurrency(stats.totalMyCosts)}</span>
          <span className="hero-stat-label">Meine Kosten</span>
        </div>
        <div className="hero-stat-divider" />
        <div className="hero-stat">
          <span className="hero-stat-value">{formatCurrency(stats.avgCostPerPerson)}</span>
          <span className="hero-stat-label">Durchschn. / Person</span>
        </div>
        <div className="hero-stat-divider" />
        <div className="hero-stat">
          <span className="hero-stat-value">{events.length}</span>
          <span className="hero-stat-label">Events</span>
        </div>
      </div>

      <div className="detail-row">
        {/* Costs per Event */}
        {stats.costsPerEvent.length > 0 && (
          <div className="detail-card">
            <div className="detail-card-header">
              <h3>Kosten pro Event</h3>
            </div>
            <div className="detail-card-body detail-card-body-tall">
              {stats.costsPerEvent.map((ev) => {
                const maxCost = Math.max(...stats.costsPerEvent.map((e) => e.total))
                return (
                  <div key={ev.date + ev.name} className="detail-list-item stat-item">
                    <div className="stat-item-label">
                      <span className="stat-item-name">{ev.name}</span>
                      <span className="stat-item-date">{formatDateGerman(ev.date)}</span>
                    </div>
                    <div className="stat-bar-wrapper">
                      <div className="stat-bar-track">
                        <div
                          className="stat-bar stat-bar-total"
                          style={{ width: `${(ev.total / maxCost) * 100}%` }}
                        />
                        <div
                          className="stat-bar stat-bar-mine"
                          style={{ width: `${(ev.myCost / maxCost) * 100}%` }}
                        />
                      </div>
                      <span className="stat-bar-value">{formatCurrency(ev.total)}</span>
                    </div>
                  </div>
                )
              })}
              <div className="stat-legend">
                <span className="stat-legend-item"><span className="stat-dot stat-dot-total" /> Gesamt</span>
                <span className="stat-legend-item"><span className="stat-dot stat-dot-mine" /> Meine Kosten</span>
              </div>
            </div>
          </div>
        )}

        {/* Top Spenders */}
        {stats.topSpenders.length > 0 && (
          <div className="detail-card">
            <div className="detail-card-header">
              <h3>Top Besteller</h3>
              <span className="detail-card-badge">nach Ausgaben</span>
            </div>
            <div className="detail-card-body detail-card-body-tall">
              {stats.topSpenders.map(([personName, total], idx) => (
                <div key={personName} className="detail-list-item">
                  <span className="detail-list-name">
                    <span
                      className="avatar avatar-sm avatar-clickable"
                      style={{ background: getAvatarColor(personName) }}
                      onClick={() => onSelectPerson(personName)}
                      title={`Profil von ${personName} anzeigen`}
                    >
                      {getInitials(personName)}
                    </span>
                    <span className="stat-rank">#{idx + 1}</span> {personName}
                  </span>
                  <div className="item-bar-wrapper">
                    <div
                      className="item-bar"
                      style={{ width: `${(total / stats.topSpenders[0][1]) * 100}%` }}
                    />
                    <span className="item-bar-count">{formatCurrency(total)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* All Items */}
      {stats.allItems.length > 0 && (
        <div className="detail-row">
          <div className="detail-card">
            <div className="detail-card-header">
              <h3>Alle Artikel</h3>
              <span className="detail-card-badge">
                {stats.allItems.reduce((s, [, c]) => s + c, 0)} gesamt
              </span>
            </div>
            <div className="detail-card-body detail-card-body-tall">
              {stats.allItems.map(([itemName, count]) => (
                <div key={itemName} className="detail-list-item">
                  <span className="detail-list-name">{getItemEmoji(itemName)} {itemName}</span>
                  <div className="item-bar-wrapper">
                    <div
                      className="item-bar"
                      style={{ width: `${(count / stats.allItems[0][1]) * 100}%` }}
                    />
                    <span className="item-bar-count">{count}x</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Price History Charts */}
      {stats.priceHistory.length > 0 && (
        <>
          <h3 className="section-title">Preisverlauf pro Artikel</h3>
          <div className="price-charts-grid">
            {stats.priceHistory.map((item, itemIdx) => {
              const color = CHART_COLORS[itemIdx % CHART_COLORS.length]
              const prices = item.dataPoints.map((d) => d.unitPrice)
              const maxPrice = Math.max(...prices)
              const minPrice = Math.min(...prices)
              const range = maxPrice - minPrice || 1
              const padding = range * 0.15

              const chartW = 280
              const chartH = 120
              const padL = 50
              const padR = 16
              const padT = 12
              const padB = 30
              const plotW = chartW - padL - padR
              const plotH = chartH - padT - padB

              const yMin = minPrice - padding
              const yMax = maxPrice + padding

              const points = item.dataPoints.map((d, i) => {
                const x = padL + (item.dataPoints.length === 1 ? plotW / 2 : (i / (item.dataPoints.length - 1)) * plotW)
                const y = padT + plotH - ((d.unitPrice - yMin) / (yMax - yMin)) * plotH
                return { x, y, ...d }
              })

              const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')

              // Area under line
              const areaPath = linePath +
                ` L${points[points.length - 1].x},${padT + plotH}` +
                ` L${points[0].x},${padT + plotH} Z`

              // Y-axis labels (3 ticks)
              const yTicks = [yMin, (yMin + yMax) / 2, yMax].map((val) => ({
                val,
                y: padT + plotH - ((val - yMin) / (yMax - yMin)) * plotH,
              }))

              return (
                <div key={item.itemName} className="price-chart-card">
                  <div className="price-chart-header">
                    <span className="price-chart-dot" style={{ background: color }} />
                    <span className="price-chart-title">{getItemEmoji(item.itemName)} {item.itemName}</span>
                    {item.dataPoints.length > 1 && (() => {
                      const first = item.dataPoints[0].unitPrice
                      const last = item.dataPoints[item.dataPoints.length - 1].unitPrice
                      const diff = last - first
                      const pct = first > 0 ? (diff / first) * 100 : 0
                      return (
                        <span className={`price-chart-trend ${diff > 0 ? 'trend-up' : diff < 0 ? 'trend-down' : ''}`}>
                          {diff > 0 ? '+' : ''}{pct.toFixed(0)}%
                        </span>
                      )
                    })()}
                  </div>
                  <svg
                    viewBox={`0 0 ${chartW} ${chartH}`}
                    className="price-chart-svg"
                    preserveAspectRatio="xMidYMid meet"
                  >
                    {/* Grid lines */}
                    {yTicks.map((t, i) => (
                      <g key={i}>
                        <line
                          x1={padL} y1={t.y} x2={chartW - padR} y2={t.y}
                          stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3,3"
                        />
                        <text x={padL - 6} y={t.y + 3} textAnchor="end" className="chart-label">
                          {t.val.toFixed(2)}
                        </text>
                      </g>
                    ))}

                    {/* Area */}
                    <path d={areaPath} fill={color} opacity="0.08" />

                    {/* Line */}
                    <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

                    {/* Dots + labels */}
                    {points.map((p, i) => (
                      <g key={i}>
                        <circle cx={p.x} cy={p.y} r="4" fill={color} />
                        <circle cx={p.x} cy={p.y} r="6" fill={color} opacity="0.2" />
                        {/* Event date label */}
                        <text
                          x={p.x}
                          y={padT + plotH + 14}
                          textAnchor="middle"
                          className="chart-label-date"
                        >
                          {formatDateGerman(p.date).slice(0, 6)}
                        </text>
                      </g>
                    ))}
                  </svg>
                  <div className="price-chart-footer">
                    <span>Einzelpreis</span>
                    <span className="price-chart-current">{formatCurrency(prices[prices.length - 1])}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Season Review */}
      {stats.seasons.length > 0 && (
        <>
          <h3 className="section-title">Saison-Rueckblick</h3>
          <div className="season-grid">
            {stats.seasons.map((s) => (
              <div key={s.year} className="season-card">
                <div className="season-year">{s.year}</div>
                <div className="season-stats">
                  <div className="season-stat">
                    <span className="season-stat-value">{s.eventCount}</span>
                    <span className="season-stat-label">{s.eventCount === 1 ? 'Event' : 'Events'}</span>
                  </div>
                  <div className="season-stat">
                    <span className="season-stat-value">{s.personCount}</span>
                    <span className="season-stat-label">Personen</span>
                  </div>
                  <div className="season-stat">
                    <span className="season-stat-value">{s.totalItemsOrdered}</span>
                    <span className="season-stat-label">Bestellungen</span>
                  </div>
                </div>
                <div className="season-costs">
                  <div className="season-cost-row">
                    <span>Gesamtkosten</span>
                    <span className="season-cost-value">{formatCurrency(s.totalCost)}</span>
                  </div>
                  <div className="season-cost-row">
                    <span>Meine Kosten</span>
                    <span className="season-cost-value season-cost-accent">{formatCurrency(s.myCost)}</span>
                  </div>
                </div>
                {s.topItem && (
                  <div className="season-highlight">
                    Beliebtester Artikel: <strong>{s.topItem}</strong> ({s.topItemCount}x)
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {events.length === 0 && (
        <div className="empty-state">
          <p>Noch keine Daten fuer Statistiken vorhanden.</p>
        </div>
      )}
    </div>
  )
})
