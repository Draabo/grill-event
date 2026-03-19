import { memo, useState, useMemo } from 'react'
import { GrillEvent, GrillItem } from '../../types'
import { formatDateGerman, formatCurrency } from '../../utils/format'
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
      const othersReceived = (ev.persons ?? []).reduce((s, p) => {
        if (isMe(p.name)) return s
        return s + ((ev.billing ?? []).find((b) => b.personId === p.id)?.received ?? 0)
      }, 0)
      return sum + (costs - othersReceived)
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
    const totalDebt = [...debtMap.values()].reduce((s, v) => s + v, 0)

    return { totalCostsAll, totalMyCosts, totalDebt, debtMap }
  }, [events])

  const visibleDebt = [...stats.debtMap.values()].reduce((sum, v) => sum + v, 0)

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

      {/* Dashboard */}
      {stats.totalCostsAll > 0 && (() => {
        const visibleDebts = [...stats.debtMap.entries()]
          .sort((a, b) => b[1] - a[1])

        return (
          <div className="dashboard">
            <div className="stats-row">
              <div className="stat-card">
                <span className="stat-card-label">Gesamtkosten</span>
                <span className="stat-card-value">{formatCurrency(stats.totalCostsAll)}</span>
              </div>
              <div className="stat-card">
                <span className="stat-card-label">Meine Kosten</span>
                <span className="stat-card-value accent">{formatCurrency(stats.totalMyCosts)}</span>
              </div>
              {visibleDebt > 0 && (
                <div className="stat-card">
                  <span className="stat-card-label">Offene Schulden</span>
                  <span className="stat-card-value negative">{formatCurrency(visibleDebt)}</span>
                </div>
              )}
            </div>

            {visibleDebts.length > 0 && (
              <div className="debt-list">
                <div className="debt-list-header">Offene Schulden</div>
                  {visibleDebts.map(([personName, debt]) => (
                    <div key={personName} className="debt-row">
                      <span className="debt-person">
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
                      <span className="debt-actions">
                        <span className="negative debt-amount">{formatCurrency(debt)}</span>
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
            )}
          </div>
        )
      })()}

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
                    {event.shareCode && (
                      <span className={`tag ${event.registrationOpen !== false ? 'tag-open' : 'tag-closed'}`}>
                        {event.registrationOpen !== false ? 'Offen' : 'Geschlossen'}
                      </span>
                    )}
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
