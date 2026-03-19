import { memo, useState, useCallback, useMemo } from 'react'
import { GrillEvent } from '../../types'
import { formatDateGerman } from '../../utils/format'
import { getItemEmoji } from '../../utils/emoji'
import './GuestJoin.css'

interface GuestJoinProps {
  event: GrillEvent
  allEvents: GrillEvent[]
  onAddPerson: (name: string, pin: string) => void
  onRemovePerson: (personId: string) => void
  onAddItem: (name: string) => void
  onSetOrderQuantity: (personId: string, itemId: string, quantity: number) => void
}

export const GuestJoin = memo(function GuestJoin({
  event,
  allEvents,
  onAddPerson,
  onRemovePerson,
  onAddItem,
  onSetOrderQuantity,
}: GuestJoinProps) {
  const [guestName, setGuestName] = useState('')
  const [guestPin, setGuestPin] = useState('')
  const [joinedPersonId, setJoinedPersonId] = useState<string | null>(null)
  const [waitingForName, setWaitingForName] = useState('')
  const [newItem, setNewItem] = useState('')
  const [nameError, setNameError] = useState('')

  const { persons, items, orders } = event

  const joinedPerson = joinedPersonId
    ? persons.find((p) => p.id === joinedPersonId)
    : null

  const handleJoin = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    const name = guestName.trim()
    const pin = guestPin.trim()
    if (!name || pin.length < 4) {
      setNameError(pin.length < 4 ? 'Pin muss mindestens 4 Zeichen haben.' : '')
      return
    }

    const existing = persons.find((p) => p.name.toLowerCase() === name.toLowerCase())
    if (existing) {
      // Allow re-entry with correct pin
      if (existing.pin && existing.pin === pin) {
        setJoinedPersonId(existing.id)
        setNameError('')
        return
      }
      setNameError(existing.pin ? 'Falscher Pin.' : `"${existing.name}" ist bereits eingetragen.`)
      return
    }
    setNameError('')
    setWaitingForName(name.toLowerCase())
    onAddPerson(name, pin)
  }, [guestName, guestPin, persons, onAddPerson])

  // Auto-detect: only after WE added a person (not for existing names)
  if (waitingForName && !joinedPersonId) {
    const found = persons.find((p) => p.name.toLowerCase() === waitingForName)
    if (found) {
      setJoinedPersonId(found.id)
      setWaitingForName('')
    }
  }

  const handleLeave = useCallback(() => {
    if (!joinedPerson) return
    if (confirm('Moechtest du dich wirklich abmelden? Deine Bestellungen werden geloescht.')) {
      onRemovePerson(joinedPerson.id)
      setJoinedPersonId(null)
      setWaitingForName('')
      setGuestName('')
      setGuestPin('')
    }
  }, [joinedPerson, onRemovePerson])

  const getQuantity = (personId: string, itemId: string): number => {
    return orders.find((o) => o.personId === personId && o.itemId === itemId)?.quantity ?? 0
  }

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItem.trim()) return
    onAddItem(newItem.trim())
    setNewItem('')
  }

  // All known item names across all events (deduplicated)
  const allKnownItems = useMemo(() => {
    const nameSet = new Set<string>()
    for (const ev of allEvents) {
      for (const item of ev.items ?? []) {
        nameSet.add(item.name)
      }
    }
    // Current event items first, then known items not yet in this event
    const currentNames = new Set(items.map((i) => i.name))
    const extraNames = [...nameSet].filter((n) => !currentNames.has(n))
    return extraNames
  }, [allEvents, items])

  // Registration closed (default is open if undefined)
  if (event.registrationOpen === false && !joinedPerson) {
    return (
      <div className="guest-page">
        <div className="guest-hero">
          <h1 className="guest-event-name">{event.name}</h1>
          <span className="guest-event-date">{formatDateGerman(event.date)}</span>
        </div>
        <div className="guest-closed">
          <p>Die Anmeldung fuer dieses Event ist geschlossen.</p>
        </div>
        {persons.length > 0 && (
          <div className="guest-who-is-coming">
            <h3>Wer kommt? ({persons.length})</h3>
            <div className="guest-names">
              {persons.map((p) => (
                <span key={p.id} className="guest-name-chip">{p.name}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Not joined yet — show join screen
  if (!joinedPerson) {
    return (
      <div className="guest-page">
        <div className="guest-hero">
          <h1 className="guest-event-name">{event.name}</h1>
          <span className="guest-event-date">{formatDateGerman(event.date)}</span>
          {persons.length > 0 && (
            <span className="guest-attendees">{persons.length} {persons.length === 1 ? 'Person' : 'Personen'} dabei</span>
          )}
        </div>

        <form className="guest-join-form" onSubmit={handleJoin}>
          <label>Wie heisst du?</label>
          <input
            type="text"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="Dein Name..."
            autoFocus
          />
          <label>Dein Pin (zum Zurückkommen)</label>
          <input
            type="text" autoComplete="off" className="pin-input"
            inputMode="numeric"
            value={guestPin}
            onChange={(e) => setGuestPin(e.target.value)}
            placeholder="4-stelliger Pin..."
          />
          {nameError && <span className="guest-error">{nameError}</span>}
          <button className="btn btn-primary" type="submit">Ich bin dabei!</button>
        </form>

        {persons.length > 0 && (
          <div className="guest-who-is-coming">
            <h3>Wer kommt?</h3>
            <div className="guest-names">
              {persons.map((p) => (
                <span key={p.id} className="guest-name-chip">{p.name}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Joined — show order screen
  return (
    <div className="guest-page">
      <div className="guest-hero">
        <h1 className="guest-event-name">{event.name}</h1>
        <span className="guest-event-date">{formatDateGerman(event.date)}</span>
        <span className="guest-welcome">Hallo, {joinedPerson.name}!</span>
      </div>

      {/* Order items */}
      <div className="guest-section">
        <h3>Was moechtest du bestellen?</h3>
        {items.length === 0 ? (
          <p className="guest-hint">Noch keine Artikel vorhanden. Schlage welche vor!</p>
        ) : (
          <div className="guest-items">
            {items.map((item) => {
              const qty = getQuantity(joinedPerson.id, item.id)
              return (
                <div key={item.id} className="guest-item-row">
                  <span className="guest-item-name">
                    {getItemEmoji(item.name)} {item.name}
                  </span>
                  <div className="guest-qty-controls">
                    <button
                      className="guest-qty-btn"
                      onClick={() => onSetOrderQuantity(joinedPerson.id, item.id, Math.max(0, qty - 1))}
                      disabled={qty === 0}
                    >
                      -
                    </button>
                    <span className="guest-qty-value">{qty}</span>
                    <button
                      className="guest-qty-btn"
                      onClick={() => onSetOrderQuantity(joinedPerson.id, item.id, qty + 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Suggest item */}
      <div className="guest-section">
        <h3>Artikel vorschlagen</h3>
        <form className="guest-add-item" onSubmit={handleAddItem}>
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="z.B. Halloumi, Maiskolben..."
          />
          <button className="btn btn-primary btn-sm" type="submit">+</button>
        </form>
        {allKnownItems.length > 0 && (
          <div className="guest-known-items">
            <span className="guest-known-label">Bekannte Artikel:</span>
            <div className="guest-names">
              {allKnownItems.map((name) => (
                <button
                  key={name}
                  className="guest-name-chip guest-add-chip"
                  onClick={() => onAddItem(name)}
                >
                  {getItemEmoji(name)} + {name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Who is coming */}
      <div className="guest-section">
        <h3>Wer kommt? ({persons.length})</h3>
        <div className="guest-names">
          {persons.map((p) => (
            <span key={p.id} className={`guest-name-chip ${p.id === joinedPerson.id ? 'guest-name-me' : ''}`}>
              {p.name}
            </span>
          ))}
        </div>
      </div>

      {/* Leave */}
      <div className="guest-section guest-leave">
        <button className="btn btn-danger btn-sm" onClick={handleLeave}>
          Abmelden
        </button>
      </div>
    </div>
  )
})
