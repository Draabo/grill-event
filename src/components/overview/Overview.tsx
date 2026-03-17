import { memo, useState, useMemo } from 'react'
import { GrillEvent, GrillItem } from '../../types'
import { formatDateGerman, formatCurrency } from '../../utils/format'
import { getItemEmoji } from '../../utils/emoji'
import { PayPalModal } from '../shared/PayPalModal'
import './Overview.css'

interface OverviewProps {
  events: GrillEvent[]
  onSelectEvent: (eventId: string) => void
  onAddEvent: (name: string, date: string) => string
  onDeleteEvent: (eventId: string) => void
  onDuplicateEvent: (eventId: string) => void
  onShowStatistics: () => void
  onSelectPerson: (name: string) => void
  dismissedDebts: string[]
  onDismissDebt: (personName: string) => void
  onMarkPersonPaid: (personName: string) => void
  paypalUsername: string
  onSetPaypalUsername: (username: string) => void
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

export const Overview = memo(function Overview({
  events,
  onSelectEvent,
  onAddEvent,
  onDeleteEvent,
  onDuplicateEvent,
  onShowStatistics,
  onSelectPerson,
  dismissedDebts,
  onDismissDebt,
  onMarkPersonPaid,
  paypalUsername,
  onSetPaypalUsername,
}: OverviewProps) {
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [showPaypalSettings, setShowPaypalSettings] = useState(false)
  const [paypalDraft, setPaypalDraft] = useState(paypalUsername)
  const [paypalModal, setPaypalModal] = useState<{ name: string; amount: number } | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !date) return
    onAddEvent(name.trim(), date)
    setName('')
    setDate('')
    setShowForm(false)
  }

  const handlePaypalSave = () => {
    onSetPaypalUsername(paypalDraft.trim())
    setShowPaypalSettings(false)
  }

  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  const stats = useMemo(() => {
    const totalCostsAll = events.reduce((sum, ev) => sum + getEventTotalCosts(ev), 0)
    const totalMyCosts = events.reduce((sum, ev) => {
      const costs = getEventTotalCosts(ev)
      const charged = getEventTotalCharged(ev)
      return sum + (costs - charged)
    }, 0)

    const debtMap = new Map<string, number>()
    for (const ev of events) {
      for (const p of ev.persons ?? []) {
        if (isMe(p.name)) continue
        const billing = (ev.billing ?? []).find((b) => b.personId === p.id)
        if (billing?.note) continue
        const charged = billing?.charged ?? 0
        const received = billing?.received ?? 0
        const debt = Math.max(0, charged - received)
        if (debt > 0) {
          debtMap.set(p.name, (debtMap.get(p.name) ?? 0) + debt)
        }
      }
    }
    for (const [key, val] of debtMap) {
      if (val === 0) debtMap.delete(key)
    }
    const totalDebt = [...debtMap.values()].reduce((s, v) => s + v, 0)

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

    return { totalCostsAll, totalMyCosts, totalDebt, debtMap, allItems }
  }, [events])

  const visibleDebt = [...stats.debtMap.entries()]
    .filter(([name]) => !dismissedDebts.includes(name))
    .reduce((sum, [, v]) => sum + v, 0)

  return (
    <div className="overview">
      {/* Header */}
      <div className="overview-header">
        <div>
          <h2>Grill Events</h2>
          {events.length > 0 && (
            <span className="overview-subtitle">{events.length} Events insgesamt</span>
          )}
        </div>
        <div className="overview-header-actions">
          {events.length > 0 && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={onShowStatistics}
            >
              Statistiken
            </button>
          )}
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => { setPaypalDraft(paypalUsername); setShowPaypalSettings(!showPaypalSettings) }}
            title="PayPal Einstellungen"
          >
            PayPal
          </button>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Abbrechen' : '+ Neues Event'}
          </button>
        </div>
      </div>

      {/* PayPal Settings */}
      {showPaypalSettings && (
        <div className="paypal-settings">
          <label>PayPal.me Benutzername:</label>
          <div className="paypal-settings-row">
            <span className="paypal-settings-prefix">paypal.me/</span>
            <input
              type="text"
              value={paypalDraft}
              onChange={(e) => setPaypalDraft(e.target.value)}
              placeholder="DeinBenutzername"
              autoFocus
            />
            <button className="btn btn-primary btn-sm" onClick={handlePaypalSave}>
              Speichern
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <form className="event-form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Event-Name (z.B. Sommergrillen 2026)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <button className="btn btn-primary" type="submit">
            Erstellen
          </button>
        </form>
      )}

      {/* Hero Stats */}
      {stats.totalCostsAll > 0 && (
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
          {visibleDebt > 0 && (
            <>
              <div className="hero-stat-divider" />
              <div className="hero-stat">
                <span className="hero-stat-value negative">{formatCurrency(visibleDebt)}</span>
                <span className="hero-stat-label">Offene Schulden</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Detail Cards */}
      {(stats.debtMap.size > 0 || stats.allItems.length > 0) && (
        <div className="detail-row">
          {stats.debtMap.size > 0 && (() => {
            const visible = [...stats.debtMap.entries()]
              .filter(([name]) => !dismissedDebts.includes(name))
              .sort((a, b) => b[1] - a[1])

            return visible.length > 0 ? (
              <div className="detail-card">
                <div className="detail-card-header">
                  <h3>Offene Schulden</h3>
                </div>
                <div className="detail-card-body">
                  {visible.map(([personName, debt]) => (
                    <div key={personName} className="detail-list-item">
                      <span className="detail-list-name">
                        <span
                          className="avatar avatar-clickable"
                          style={{ background: getAvatarColor(personName) }}
                          onClick={() => onSelectPerson(personName)}
                          title={`Profil von ${personName} anzeigen`}
                        >
                          {getInitials(personName)}
                        </span>
                        {personName}
                      </span>
                      <span className="detail-list-right">
                        <span className="negative">{formatCurrency(debt)}</span>
                        {paypalUsername && (
                          <button
                            className="debt-paypal-btn"
                            onClick={() => setPaypalModal({ name: personName, amount: debt })}
                            title="PayPal Link anzeigen"
                          >
                            PP
                          </button>
                        )}
                        <button
                          className="debt-paid-btn"
                          onClick={() => onMarkPersonPaid(personName)}
                          title="Als bezahlt markieren"
                        >
                          &#10003;
                        </button>
                        <button
                          className="debt-clear-btn"
                          onClick={() => onDismissDebt(personName)}
                          title="Ausblenden"
                        >
                          x
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null
          })()}

          {stats.allItems.length > 0 && (
            <div className="detail-card">
              <div className="detail-card-header">
                <h3>Alle Artikel</h3>
                <span className="detail-card-badge">
                  {stats.allItems.reduce((s, [, c]) => s + c, 0)} gesamt
                </span>
              </div>
              <div className="detail-card-body">
                {stats.allItems.map(([itemName, count]) => (
                  <div key={itemName} className="detail-list-item">
                    <span className="detail-list-name">{getItemEmoji(itemName)} {itemName}</span>
                    <div className="item-bar-wrapper">
                      <div
                        className="item-bar"
                        style={{
                          width: `${(count / stats.allItems[0][1]) * 100}%`,
                        }}
                      />
                      <span className="item-bar-count">{count}x</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Events */}
      {sortedEvents.length === 0 ? (
        <div className="empty-state">
          <p>Noch keine Events vorhanden.</p>
          <p>Erstelle dein erstes Grill-Event!</p>
        </div>
      ) : (
        <>
          <h3 className="section-title">Events</h3>
          <div className="event-grid">
            {sortedEvents.map((event) => {
              const totalCosts = getEventTotalCosts(event)
              const totalCharged = getEventTotalCharged(event)
              const personCount = event.persons?.length ?? 0
              const itemCount = event.items?.length ?? 0

              return (
                <div
                  key={event.id}
                  className="event-card"
                  onClick={() => onSelectEvent(event.id)}
                >
                  <div className="event-card-top">
                    <div className="event-card-date-badge">
                      {formatDateGerman(event.date)}
                    </div>
                    <button
                      className="event-duplicate-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDuplicateEvent(event.id)
                      }}
                      title="Event duplizieren"
                    >
                      &#x2398;
                    </button>
                    <button
                      className="event-delete-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirm(`"${event.name}" wirklich loeschen?`)) {
                          onDeleteEvent(event.id)
                        }
                      }}
                    >
                      x
                    </button>
                  </div>
                  <h3 className="event-card-name">{event.name}</h3>
                  <div className="event-card-tags">
                    <span className="tag">{personCount} Personen</span>
                    <span className="tag">{itemCount} Artikel</span>
                  </div>
                  {totalCosts > 0 && (
                    <div className="event-card-bottom">
                      <div className="event-card-cost-row">
                        <span>Gesamt</span>
                        <span>{formatCurrency(totalCosts)}</span>
                      </div>
                      {totalCharged > 0 && (
                        <div className="event-card-cost-row highlight">
                          <span>Meine Kosten</span>
                          <span>{formatCurrency(totalCosts - totalCharged)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* PayPal Modal */}
      {paypalModal && paypalUsername && (
        <PayPalModal
          personName={paypalModal.name}
          amount={paypalModal.amount}
          paypalUsername={paypalUsername}
          onClose={() => setPaypalModal(null)}
        />
      )}
    </div>
  )
})
