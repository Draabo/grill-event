import { memo, useMemo } from 'react'
import { GrillEvent, GrillItem } from '../../types'
import { formatDateGerman, formatCurrency } from '../../utils/format'
import { getItemEmoji } from '../../utils/emoji'
import './PersonProfile.css'

interface PersonProfileProps {
  personName: string
  events: GrillEvent[]
  onBack: () => void
  onSelectEvent: (eventId: string) => void
}

const AVATAR_COLORS = [
  '#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#1abc9c',
  '#3498db', '#9b59b6', '#e91e63', '#00bcd4', '#ff5722',
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

export const PersonProfile = memo(function PersonProfile({
  personName,
  events,
  onBack,
  onSelectEvent,
}: PersonProfileProps) {
  const data = useMemo(() => {
    // Find all events this person participated in
    const participatedEvents = events
      .filter((ev) => (ev.persons ?? []).some((p) => p.name === personName))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    // Per-event breakdown
    const eventDetails = participatedEvents.map((ev) => {
      const person = ev.persons.find((p) => p.name === personName)!
      const billing = (ev.billing ?? []).find((b) => b.personId === person.id)

      // Items ordered in this event
      const itemsOrdered: { name: string; quantity: number; cost: number }[] = []
      for (const item of ev.items ?? []) {
        const order = (ev.orders ?? []).find(
          (o) => o.personId === person.id && o.itemId === item.id
        )
        if (order && order.quantity > 0) {
          itemsOrdered.push({
            name: item.name,
            quantity: order.quantity,
            cost: order.quantity * getUnitPrice(ev, item),
          })
        }
      }

      const totalCost = itemsOrdered.reduce((s, i) => s + i.cost, 0)

      return {
        eventId: ev.id,
        eventName: ev.name,
        date: ev.date,
        itemsOrdered,
        totalCost,
        charged: billing?.charged ?? 0,
        received: billing?.received ?? 0,
        note: billing?.note,
      }
    })

    // Aggregate stats
    const totalSpent = eventDetails.reduce((s, e) => s + e.totalCost, 0)
    const totalCharged = eventDetails.reduce((s, e) => s + e.charged, 0)
    const totalReceived = eventDetails.reduce((s, e) => s + e.received, 0)

    // Favorite items across all events
    const itemCounts = new Map<string, number>()
    for (const ed of eventDetails) {
      for (const item of ed.itemsOrdered) {
        itemCounts.set(item.name, (itemCounts.get(item.name) ?? 0) + item.quantity)
      }
    }
    const favoriteItems = [...itemCounts.entries()].sort((a, b) => b[1] - a[1])

    // Cost over time (chronological)
    const costOverTime = [...eventDetails]
      .reverse()
      .map((ed) => ({ name: ed.eventName, date: ed.date, cost: ed.totalCost }))

    const avgCostPerEvent = eventDetails.length > 0 ? totalSpent / eventDetails.length : 0

    return {
      eventDetails,
      totalSpent,
      totalCharged,
      totalReceived,
      favoriteItems,
      costOverTime,
      avgCostPerEvent,
      eventCount: participatedEvents.length,
    }
  }, [events, personName])

  const isIch = personName.toLowerCase() === 'ich'

  return (
    <div className="person-profile">
      <div className="person-profile-header">
        <button className="btn btn-secondary" onClick={onBack}>
          Zurück
        </button>
        <div className="person-profile-identity">
          <span
            className="avatar avatar-lg"
            style={{ background: getAvatarColor(personName) }}
          >
            {getInitials(personName)}
          </span>
          <div>
            <h2>{personName}</h2>
            <span className="person-profile-subtitle">
              {data.eventCount} {data.eventCount === 1 ? 'Event' : 'Events'} besucht
            </span>
          </div>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="hero-stats">
        <div className="hero-stat">
          <span className="hero-stat-value">{formatCurrency(data.totalSpent)}</span>
          <span className="hero-stat-label">Gesamtkosten</span>
        </div>
        <div className="hero-stat-divider" />
        <div className="hero-stat">
          <span className="hero-stat-value">{formatCurrency(data.avgCostPerEvent)}</span>
          <span className="hero-stat-label">Durchschn. / Event</span>
        </div>
        {!isIch && (
          <>
            <div className="hero-stat-divider" />
            <div className="hero-stat">
              <span className="hero-stat-value">{formatCurrency(data.totalCharged)}</span>
              <span className="hero-stat-label">Verlangt</span>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat">
              <span className={`hero-stat-value ${data.totalCharged - data.totalReceived > 0 ? 'negative' : ''}`}>
                {formatCurrency(Math.max(0, data.totalCharged - data.totalReceived))}
              </span>
              <span className="hero-stat-label">Offen</span>
            </div>
          </>
        )}
      </div>

      <div className="detail-row">
        {/* Favorite Items */}
        {data.favoriteItems.length > 0 && (
          <div className="detail-card">
            <div className="detail-card-header">
              <h3>Lieblingsartikel</h3>
              <span className="detail-card-badge">
                {data.favoriteItems.reduce((s, [, c]) => s + c, 0)} bestellt
              </span>
            </div>
            <div className="detail-card-body">
              {data.favoriteItems.map(([itemName, count], idx) => (
                <div key={itemName} className="detail-list-item">
                  <span className="detail-list-name">
                    <span className="stat-rank">#{idx + 1}</span> {getItemEmoji(itemName)} {itemName}
                  </span>
                  <div className="item-bar-wrapper">
                    <div
                      className="item-bar"
                      style={{ width: `${(count / data.favoriteItems[0][1]) * 100}%` }}
                    />
                    <span className="item-bar-count">{count}x</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cost per Event */}
        {data.costOverTime.length > 0 && (
          <div className="detail-card">
            <div className="detail-card-header">
              <h3>Kosten pro Event</h3>
            </div>
            <div className="detail-card-body">
              {data.costOverTime.map((e) => {
                const maxCost = Math.max(...data.costOverTime.map((x) => x.cost))
                return (
                  <div key={e.date + e.name} className="detail-list-item stat-item">
                    <div className="stat-item-label">
                      <span className="stat-item-name">{e.name}</span>
                      <span className="stat-item-date">{formatDateGerman(e.date)}</span>
                    </div>
                    <div className="stat-bar-wrapper">
                      <div className="stat-bar-track">
                        <div
                          className="stat-bar stat-bar-mine"
                          style={{ width: maxCost > 0 ? `${(e.cost / maxCost) * 100}%` : '0%' }}
                        />
                      </div>
                      <span className="stat-bar-value">{formatCurrency(e.cost)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Event History */}
      <h3 className="section-title">Event-Verlauf</h3>
      <div className="person-event-list">
        {data.eventDetails.map((ed) => (
          <div
            key={ed.eventId}
            className="person-event-card"
            onClick={() => onSelectEvent(ed.eventId)}
          >
            <div className="person-event-top">
              <div>
                <span className="person-event-name">{ed.eventName}</span>
                <span className="person-event-date">{formatDateGerman(ed.date)}</span>
              </div>
              <span className="person-event-cost">{formatCurrency(ed.totalCost)}</span>
            </div>
            {ed.itemsOrdered.length > 0 && (
              <div className="person-event-items">
                {ed.itemsOrdered.map((item) => (
                  <span key={item.name} className="person-event-item-chip">
                    {getItemEmoji(item.name)} {item.name} {item.quantity}x
                  </span>
                ))}
              </div>
            )}
            {!isIch && ed.charged > 0 && (
              <div className="person-event-billing">
                <span>Verlangt: {formatCurrency(ed.charged)}</span>
                <span className={ed.note ? '' : ed.received >= ed.charged ? 'positive' : 'negative'}>
                  {ed.note ? ed.note : ed.received >= ed.charged ? 'Bezahlt' : `Offen: ${formatCurrency(ed.charged - ed.received)}`}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {data.eventCount === 0 && (
        <div className="empty-state">
          <p>Diese Person hat noch an keinem Event teilgenommen.</p>
        </div>
      )}
    </div>
  )
})
