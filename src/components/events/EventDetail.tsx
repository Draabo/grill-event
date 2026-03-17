import { memo, useState, useRef, useCallback } from 'react'
import { GrillEvent, GrillItem, PersonBilling, SavedTemplates } from '../../types'
import { formatCurrency } from '../../utils/format'
import { getItemEmoji } from '../../utils/emoji'
import { CurrencyInput } from '../shared/CurrencyInput'
import { EditableText } from '../shared/EditableText'
import './EventDetail.css'

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

interface EventDetailProps {
  event: GrillEvent
  templates: SavedTemplates
  onBack: () => void
  onAddPerson: (name: string) => void
  onRemovePerson: (personId: string) => void
  onUpdatePersonName: (personId: string, name: string) => void
  onAddItem: (name: string) => void
  onRemoveItem: (itemId: string) => void
  onUpdateItemName: (itemId: string, name: string) => void
  onSetItemTotalPrice: (itemId: string, totalPrice: number) => void
  onSetOrderQuantity: (personId: string, itemId: string, quantity: number) => void
  onUpdateBilling: (personId: string, updates: Partial<PersonBilling>) => void
  onUpdateEventName: (name: string) => void
  onUpdateEventDate: (date: string) => void
  onAutoCharge: () => void
  onReorderItems: (fromIndex: number, toIndex: number) => void
  onReorderPersons: (fromIndex: number, toIndex: number) => void
  onSelectPerson?: (name: string) => void
  onAddTemplatePerson: (name: string) => void
  onRemoveTemplatePerson: (name: string) => void
  onAddTemplateItem: (name: string) => void
  onRemoveTemplateItem: (name: string) => void
}

export const EventDetail = memo(function EventDetail({
  event,
  templates,
  onBack,
  onAddPerson,
  onRemovePerson,
  onUpdatePersonName,
  onAddItem,
  onRemoveItem,
  onUpdateItemName,
  onSetItemTotalPrice,
  onSetOrderQuantity,
  onUpdateBilling,
  onUpdateEventName,
  onUpdateEventDate,
  onAutoCharge,
  onReorderItems,
  onReorderPersons,
  onSelectPerson,
  onAddTemplatePerson,
  onRemoveTemplatePerson,
  onAddTemplateItem,
  onRemoveTemplateItem,
}: EventDetailProps) {
  const [newPerson, setNewPerson] = useState('')
  const [newItem, setNewItem] = useState('')
  const [ordersHidden, setOrdersHidden] = useState(false)
  const [ordersCopied, setOrdersCopied] = useState(false)

  // Drag & Drop state
  const dragItemRef = useRef<number | null>(null)
  const [dragOverItem, setDragOverItem] = useState<number | null>(null)
  const dragPersonRef = useRef<number | null>(null)
  const [dragOverPerson, setDragOverPerson] = useState<number | null>(null)

  const { persons, items, orders } = event

  const getQuantity = (personId: string, itemId: string): number => {
    return orders.find((o) => o.personId === personId && o.itemId === itemId)?.quantity ?? 0
  }

  const getItemTotal = (itemId: string): number => {
    return orders
      .filter((o) => o.itemId === itemId)
      .reduce((sum, o) => sum + o.quantity, 0)
  }

  const getUnitPrice = (item: GrillItem): number => {
    const total = getItemTotal(item.id)
    if (total === 0) return item.totalPrice > 0 ? item.totalPrice : 0
    return item.totalPrice / total
  }

  const getPersonCost = (personId: string): number => {
    return items.reduce((sum, item) => {
      const qty = getQuantity(personId, item.id)
      return sum + qty * getUnitPrice(item)
    }, 0)
  }

  const getBilling = (personId: string): PersonBilling => {
    return event.billing.find((b) => b.personId === personId) ?? {
      personId,
      charged: 0,
      received: 0,
    }
  }

  const isMe = (p: { name: string }) => p.name.toLowerCase() === 'ich'

  const totalAllCosts = persons.reduce((sum, p) => sum + getPersonCost(p.id), 0)
  const totalCharged = persons.reduce((sum, p) => {
    if (isMe(p)) return sum
    return sum + getBilling(p.id).charged
  }, 0)
  const myCost = totalAllCosts - totalCharged
  const totalReceived = persons.reduce((sum, p) => {
    if (isMe(p)) return sum + myCost
    return sum + getBilling(p.id).received
  }, 0)

  const handleAddPerson = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPerson.trim()) return
    const name = newPerson.trim()
    onAddPerson(name)
    onAddTemplatePerson(name)
    setNewPerson('')
  }

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItem.trim()) return
    const name = newItem.trim()
    onAddItem(name)
    onAddTemplateItem(name)
    setNewItem('')
  }

  const handleQuickAddPerson = (name: string) => {
    if (persons.some((p) => p.name === name)) return
    onAddPerson(name)
  }

  const handleQuickAddItem = (name: string) => {
    onAddItem(name)
  }

  const handleCopyOrders = useCallback(() => {
    const orderSummary = items
      .map((item) => {
        const total = orders
          .filter((o) => o.itemId === item.id)
          .reduce((sum, o) => sum + o.quantity, 0)
        return total > 0 ? `${item.name} ${total}x` : null
      })
      .filter(Boolean)
      .join(', ')
    if (orderSummary) {
      navigator.clipboard.writeText(orderSummary).then(() => {
        setOrdersCopied(true)
        setTimeout(() => setOrdersCopied(false), 2000)
      })
    }
  }, [items, orders])

  // Item drag handlers
  const handleItemDragStart = useCallback((index: number) => {
    dragItemRef.current = index
  }, [])

  const handleItemDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOverItem(index)
  }, [])

  const handleItemDrop = useCallback(
    (index: number) => {
      const from = dragItemRef.current
      if (from !== null && from !== index) {
        onReorderItems(from, index)
      }
      dragItemRef.current = null
      setDragOverItem(null)
    },
    [onReorderItems]
  )

  const handleItemDragEnd = useCallback(() => {
    dragItemRef.current = null
    setDragOverItem(null)
  }, [])

  // Person drag handlers
  const handlePersonDragStart = useCallback((index: number) => {
    dragPersonRef.current = index
  }, [])

  const handlePersonDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOverPerson(index)
  }, [])

  const handlePersonDrop = useCallback(
    (index: number) => {
      const from = dragPersonRef.current
      if (from !== null && from !== index) {
        onReorderPersons(from, index)
      }
      dragPersonRef.current = null
      setDragOverPerson(null)
    },
    [onReorderPersons]
  )

  const handlePersonDragEnd = useCallback(() => {
    dragPersonRef.current = null
    setDragOverPerson(null)
  }, [])

  const existingPersonNames = new Set(persons.map((p) => p.name))
  const availablePersonTemplates = templates.persons.filter((n) => !existingPersonNames.has(n))

  return (
    <div className="event-detail">
      <div className="event-detail-header">
        <button className="btn btn-secondary" onClick={onBack}>
          Zurueck
        </button>
        <div className="event-detail-title">
          <h2>
            <EditableText
              value={event.name}
              onSave={onUpdateEventName}
              className="editable-text"
              inputClassName="editable-input editable-input-title"
            />
          </h2>
          <EditableText
            value={event.date}
            onSave={onUpdateEventDate}
            type="date"
            className="event-detail-date editable-text"
            inputClassName="editable-input editable-input-date"
          />
        </div>
      </div>

      {/* Artikel */}
      <div className="add-section">
        <form className="inline-form" onSubmit={handleAddItem}>
          <input
            type="text"
            placeholder="Neuer Artikel (z.B. Bratwurst)..."
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
          />
          <button className="btn btn-primary btn-sm" type="submit">+ Artikel</button>
        </form>
        {templates.items.length > 0 && (
          <div className="template-chips">
            {templates.items.map((name) => (
              <button
                key={name}
                className="template-chip"
                onClick={() => handleQuickAddItem(name)}
              >
                + {name}
                <span
                  className="template-chip-remove"
                  onClick={(e) => { e.stopPropagation(); onRemoveTemplateItem(name) }}
                >
                  x
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Personen */}
      <div className="add-section">
        <form className="inline-form" onSubmit={handleAddPerson}>
          <input
            type="text"
            placeholder="Neue Person..."
            value={newPerson}
            onChange={(e) => setNewPerson(e.target.value)}
          />
          <button className="btn btn-primary btn-sm" type="submit">+ Person</button>
        </form>
        {availablePersonTemplates.length > 0 && (
          <div className="template-chips">
            {availablePersonTemplates.map((name) => (
              <button
                key={name}
                className="template-chip"
                onClick={() => handleQuickAddPerson(name)}
              >
                + {name}
                <span
                  className="template-chip-remove"
                  onClick={(e) => { e.stopPropagation(); onRemoveTemplatePerson(name) }}
                >
                  x
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {items.length === 0 && persons.length === 0 ? (
        <div className="empty-state">
          <p>Fuege Artikel und Personen hinzu, um die Tabelle zu befuellen.</p>
        </div>
      ) : (
        <>
        {items.length > 0 && persons.length > 0 && (
          <div className="toggle-orders-wrapper">
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleCopyOrders}
              title="Bestellungen als Text kopieren (z.B. Steak 3x, Bratwurst 10x)"
            >
              {ordersCopied ? 'Kopiert!' : 'Bestellungen kopieren'}
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={onAutoCharge}
              title="Setzt 'verlangt' auf eig. Kosten aufgerundet auf 0,50 EUR"
            >
              Auto-Abrechnung
            </button>
            <button
              className="btn btn-secondary btn-sm toggle-orders-btn"
              onClick={() => setOrdersHidden((h) => !h)}
            >
              {ordersHidden ? 'Bestellungen einblenden' : 'Bestellungen ausblenden'}
            </button>
          </div>
        )}
        <div className="table-wrapper">
          <table className="grill-table">
            <thead>
              <tr>
                <th className="sticky-col"></th>
                {!ordersHidden && items.map((item, idx) => (
                  <th
                    key={item.id}
                    className={`item-header${dragOverItem === idx ? ' drag-over-col' : ''}`}
                    draggable
                    onDragStart={() => handleItemDragStart(idx)}
                    onDragOver={(e) => handleItemDragOver(e, idx)}
                    onDrop={() => handleItemDrop(idx)}
                    onDragEnd={handleItemDragEnd}
                  >
                    <span className="drag-handle" title="Ziehen zum Umsortieren">&#8942;&#8942;</span>
                    {getItemEmoji(item.name) && (
                      <span className="item-emoji">{getItemEmoji(item.name)}</span>
                    )}
                    <EditableText
                      value={item.name}
                      onSave={(name) => onUpdateItemName(item.id, name)}
                      className="item-name editable-text"
                      inputClassName="editable-input editable-input-item"
                    />
                    <button
                      className="remove-btn"
                      onClick={() => onRemoveItem(item.id)}
                      title="Artikel entfernen"
                    >
                      x
                    </button>
                  </th>
                ))}
                {items.length > 0 && (
                  <>
                    <th className="summary-header">eig Kosten</th>
                    <th className="summary-header">verlangt</th>
                    <th className="summary-header">erhalten</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {!ordersHidden && (
                <>
                  {/* Gesamtpreis row */}
                  <tr className="meta-row">
                    <td className="sticky-col row-label">Gesamtpreis</td>
                    {items.map((item) => (
                      <td key={item.id}>
                        <CurrencyInput
                          value={item.totalPrice}
                          onChange={(v) => onSetItemTotalPrice(item.id, v)}
                          className="cell-input price-input"
                          placeholder="0,00 EUR"
                        />
                      </td>
                    ))}
                    {items.length > 0 && <><td></td><td></td><td></td></>}
                  </tr>

                  {/* Einzelpreis row */}
                  <tr className="meta-row">
                    <td className="sticky-col row-label">Einzelpreis</td>
                    {items.map((item) => (
                      <td key={item.id} className="computed-cell">
                        {formatCurrency(getUnitPrice(item))}
                      </td>
                    ))}
                    {items.length > 0 && <><td></td><td></td><td></td></>}
                  </tr>

                  {/* Anzahl row */}
                  <tr className="meta-row anzahl-row">
                    <td className="sticky-col row-label">Anzahl</td>
                    {items.map((item) => (
                      <td key={item.id} className="computed-cell">
                        {getItemTotal(item.id)}
                      </td>
                    ))}
                    {items.length > 0 && <><td></td><td></td><td></td></>}
                  </tr>

                  {/* Spacer */}
                  {persons.length > 0 && items.length > 0 && (
                    <tr className="spacer-row">
                      <td colSpan={items.length + 4}></td>
                    </tr>
                  )}
                </>
              )}

              {/* Person rows */}
              {persons.map((person, idx) => {
                const cost = getPersonCost(person.id)
                const billing = getBilling(person.id)
                const me = isMe(person)

                return (
                  <tr
                    key={person.id}
                    className={`person-row${dragOverPerson === idx ? ' drag-over-row' : ''}`}
                    draggable={!ordersHidden}
                    onDragStart={() => handlePersonDragStart(idx)}
                    onDragOver={(e) => handlePersonDragOver(e, idx)}
                    onDrop={() => handlePersonDrop(idx)}
                    onDragEnd={handlePersonDragEnd}
                  >
                    <td className="sticky-col">
                      <div className="person-name-inner">
                        {!ordersHidden && (
                          <span className="drag-handle" title="Ziehen zum Umsortieren">&#8942;&#8942;</span>
                        )}
                        <span
                          className="avatar avatar-sm avatar-clickable"
                          style={{ background: getAvatarColor(person.name) }}
                          onClick={() => onSelectPerson?.(person.name)}
                          title={`Profil von ${person.name} anzeigen`}
                        >
                          {getInitials(person.name)}
                        </span>
                        <EditableText
                          value={person.name}
                          onSave={(name) => onUpdatePersonName(person.id, name)}
                          className="editable-text"
                          inputClassName="editable-input editable-input-person"
                        />
                        {!ordersHidden && (
                          <button
                            className="remove-btn"
                            onClick={() => onRemovePerson(person.id)}
                            title="Person entfernen"
                          >
                            x
                          </button>
                        )}
                      </div>
                    </td>
                    {!ordersHidden && items.map((item) => (
                      <td key={item.id}>
                        <input
                          type="number"
                          value={getQuantity(person.id, item.id) || ''}
                          onChange={(e) =>
                            onSetOrderQuantity(
                              person.id,
                              item.id,
                              Number(e.target.value) || 0
                            )
                          }
                          placeholder="0"
                          min="0"
                          step="1"
                          className="cell-input qty-input"
                        />
                      </td>
                    ))}
                    {items.length > 0 && (
                      <>
                        <td className="computed-cell cost-cell">
                          {formatCurrency(cost)}
                        </td>
                        {me ? (
                          <>
                            <td className="computed-cell">-</td>
                            <td className="computed-cell">{formatCurrency(myCost)}</td>
                          </>
                        ) : (
                          <>
                            <td>
                              <CurrencyInput
                                value={billing.charged}
                                onChange={(v) =>
                                  onUpdateBilling(person.id, { charged: v })
                                }
                                className="cell-input price-input"
                                placeholder="0,00 EUR"
                              />
                            </td>
                            <td>
                              {billing.note ? (
                                <span
                                  className="billing-note"
                                  onClick={() =>
                                    onUpdateBilling(person.id, { note: undefined, received: 0 })
                                  }
                                  title="Klicken um Betrag einzugeben"
                                >
                                  {billing.note}
                                </span>
                              ) : (
                                <CurrencyInput
                                  value={billing.received}
                                  onChange={(v) =>
                                    onUpdateBilling(person.id, { received: v })
                                  }
                                  className="cell-input price-input"
                                  placeholder="0,00 EUR"
                                  erlassen={billing.charged > 0 && billing.received === 0}
                                  onErlassen={() =>
                                    onUpdateBilling(person.id, { note: 'erlassen' })
                                  }
                                />
                              )}
                            </td>
                          </>
                        )}
                      </>
                    )}
                  </tr>
                )
              })}

              {/* Totals row */}
              {persons.length > 0 && items.length > 0 && (
                <tr className="total-row">
                  <td className="sticky-col row-label">Gesamt</td>
                  {!ordersHidden && items.map((item) => (
                    <td key={item.id} className="computed-cell">
                      {getItemTotal(item.id)}
                    </td>
                  ))}
                  <td className="computed-cell cost-cell">
                    {formatCurrency(totalAllCosts)}
                  </td>
                  <td className="computed-cell">
                    {formatCurrency(totalCharged)}
                  </td>
                  <td className="computed-cell">
                    {formatCurrency(totalReceived)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        </>
      )}

      {/* Summary */}
      {persons.length > 0 && items.length > 0 && totalAllCosts > 0 && (
        <div className="summary-box">
          <div className="summary-row">
            <span>Gesamtkosten laut Bestellung:</span>
            <strong>{formatCurrency(totalAllCosts)}</strong>
          </div>
          <div className="summary-row">
            <span>Verlangt gesamt:</span>
            <strong>{formatCurrency(totalCharged)}</strong>
          </div>
          <div className="summary-row">
            <span>Erhalten gesamt:</span>
            <strong>{formatCurrency(totalReceived)}</strong>
          </div>
          {totalCharged > 0 && (() => {
            const othersReceived = persons.reduce((sum, p) => {
              if (isMe(p)) return sum
              return sum + getBilling(p.id).received
            }, 0)
            const openDebts = totalCharged - othersReceived
            return (
              <>
                <div className="summary-row">
                  <span>Offene Schulden:</span>
                  <strong className={openDebts > 0 ? 'negative' : 'positive'}>
                    {formatCurrency(openDebts)}
                  </strong>
                </div>
                <div className="summary-row">
                  <span>Meine Kosten (was uebrig bleibt):</span>
                  <strong>{formatCurrency(myCost)}</strong>
                </div>
              </>
            )
          })()}
        </div>
      )}
    </div>
  )
})
