import { useState, useCallback, useEffect } from 'react'
import { ViewMode } from './types'
import { useEvents } from './hooks/useEvents'
import { Overview } from './components/overview'
import { EventDetail } from './components/events'
import { Statistics } from './components/statistics'
import { PersonProfile } from './components/person'
import { GuestJoin } from './components/guest'
import './App.css'

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('overview')
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [selectedPersonName, setSelectedPersonName] = useState<string | null>(null)
  const [guestShareCode, setGuestShareCode] = useState<string | null>(null)
  const [adminUnlocked, setAdminUnlocked] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState(false)
  const [isSettingPin, setIsSettingPin] = useState(false)

  // Hash routing for guest join
  useEffect(() => {
    const checkHash = () => {
      const match = window.location.hash.match(/^#\/join\/(.+)$/)
      if (match) {
        setGuestShareCode(match[1])
        setViewMode('guest-join')
      }
    }
    checkHash()
    window.addEventListener('hashchange', checkHash)
    return () => window.removeEventListener('hashchange', checkHash)
  }, [])

  const {
    events,
    templates,
    addEvent,
    deleteEvent,
    duplicateEvent,
    updateEventName,
    updateEventDate,
    addPerson,
    removePerson,
    updatePersonName,
    addItem,
    removeItem,
    updateItemName,
    setItemTotalPrice,
    setOrderQuantity,
    updateBilling,
    dismissDebt,
    markPersonPaid,
    autoCharge,
    generateShareCode,
    getEventByShareCode,
    toggleRegistration,
    adminPin,
    setAdminPin,
    firebaseReady,
    reorderItems,
    reorderPersons,
    paypalUsername,
    setPaypalUsername,
    syncStatus,
    addTemplatePerson,
    removeTemplatePerson,
    addTemplateItem,
    removeTemplateItem,
  } = useEvents()

  const handleSelectEvent = useCallback((eventId: string) => {
    setSelectedEventId(eventId)
    setViewMode('event-detail')
  }, [])

  const handleBack = useCallback(() => {
    setSelectedEventId(null)
    setSelectedPersonName(null)
    setViewMode('overview')
  }, [])

  const handleShowStatistics = useCallback(() => {
    setViewMode('statistics')
  }, [])

  const handleSelectPerson = useCallback((name: string) => {
    setSelectedPersonName(name)
    setViewMode('person-profile')
  }, [])

  const selectedEvent = events.find((e) => e.id === selectedEventId)

  return (
    <div className="app">
      {viewMode !== 'guest-join' && !adminUnlocked && !firebaseReady && (
        <div className="admin-gate">
          <div className="admin-gate-card">
            <h2>Grill Event</h2>
            <p>Laden...</p>
          </div>
        </div>
      )}
      {viewMode !== 'guest-join' && !adminUnlocked && firebaseReady && (
        <div className="admin-gate">
          <div className="admin-gate-card">
            <h2>Grill Event</h2>
            {!adminPin ? (
              <>
                <p>Setze einen Admin-Pin um deine Events zu schuetzen.</p>
                <form onSubmit={(e) => {
                  e.preventDefault()
                  if (pinInput.length >= 4) {
                    if (!isSettingPin) {
                      setIsSettingPin(true)
                      setPinInput('')
                    } else {
                      setAdminPin(pinInput)
                      setAdminUnlocked(true)
                      setPinInput('')
                      setIsSettingPin(false)
                    }
                  }
                }}>
                  <input
                    type="text" autoComplete="off" className="pin-input"
                    inputMode="numeric"
                    value={pinInput}
                    onChange={(e) => { setPinInput(e.target.value); setPinError(false) }}
                    placeholder={isSettingPin ? 'Pin wiederholen...' : 'Neuer Pin (mind. 4 Zeichen)...'}
                    autoFocus
                  />
                  <button className="btn btn-primary" type="submit">
                    {isSettingPin ? 'Pin setzen' : 'Weiter'}
                  </button>
                </form>
              </>
            ) : (
              <>
                <p>Admin-Pin eingeben</p>
                <form onSubmit={(e) => {
                  e.preventDefault()
                  if (pinInput === adminPin) {
                    setAdminUnlocked(true)
                    setPinInput('')
                    setPinError(false)
                  } else {
                    setPinError(true)
                  }
                }}>
                  <input
                    type="text" autoComplete="off" className="pin-input"
                    inputMode="numeric"
                    value={pinInput}
                    onChange={(e) => { setPinInput(e.target.value); setPinError(false) }}
                    placeholder="Pin..."
                    autoFocus
                  />
                  {pinError && <span className="pin-error">Falscher Pin</span>}
                  <button className="btn btn-primary" type="submit">Entsperren</button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {viewMode !== 'guest-join' && adminUnlocked && <header className="app-header">
        <div className="app-header-logo" onClick={handleBack} style={{ cursor: 'pointer' }}>
          <div className="header-grill">
            <div className="header-smoke-container">
              <div className="header-smoke hs-1" />
              <div className="header-smoke hs-2" />
              <div className="header-smoke hs-3" />
            </div>
            <div className="header-food">
              <div className="header-sausage hs-a" />
              <div className="header-sausage hs-b" />
            </div>
            <div className="header-grate" />
            <div className="header-body">
              <div className="header-flames">
                <div className="hf hf-1" />
                <div className="hf hf-2" />
                <div className="hf hf-3" />
              </div>
            </div>
            <div className="header-legs">
              <div className="header-leg hl-l" />
              <div className="header-leg hl-r" />
            </div>
          </div>
          <h1>Grill Event</h1>
          {syncStatus !== 'off' && (
            <span
              className={`sync-indicator sync-${syncStatus}`}
              title={
                syncStatus === 'connected' ? 'Cloud-Sync aktiv' :
                syncStatus === 'syncing' ? 'Synchronisiere...' :
                'Sync-Fehler'
              }
            />
          )}
        </div>
      </header>}

      <main className="app-main">
        {viewMode === 'overview' && adminUnlocked && (
          <Overview
            events={events}
            onSelectEvent={handleSelectEvent}
            onAddEvent={addEvent}
            onDeleteEvent={deleteEvent}
            onDuplicateEvent={duplicateEvent}
            onShowStatistics={handleShowStatistics}
            onSelectPerson={handleSelectPerson}
            onDismissDebt={dismissDebt}
            onMarkPersonPaid={markPersonPaid}
            paypalUsername={paypalUsername}
            onSetPaypalUsername={setPaypalUsername}
          />
        )}

        {viewMode === 'event-detail' && adminUnlocked && selectedEvent && (
          <EventDetail
            event={selectedEvent}
            templates={templates}
            onBack={handleBack}
            onAddPerson={(name) => addPerson(selectedEvent.id, name)}
            onRemovePerson={(personId) => removePerson(selectedEvent.id, personId)}
            onUpdatePersonName={(personId, name) => updatePersonName(selectedEvent.id, personId, name)}
            onAddItem={(name) => addItem(selectedEvent.id, name)}
            onRemoveItem={(itemId) => removeItem(selectedEvent.id, itemId)}
            onUpdateItemName={(itemId, name) => updateItemName(selectedEvent.id, itemId, name)}
            onSetItemTotalPrice={(itemId, price) =>
              setItemTotalPrice(selectedEvent.id, itemId, price)
            }
            onSetOrderQuantity={(personId, itemId, qty) =>
              setOrderQuantity(selectedEvent.id, personId, itemId, qty)
            }
            onUpdateBilling={(personId, updates) =>
              updateBilling(selectedEvent.id, personId, updates)
            }
            onUpdateEventName={(name) => updateEventName(selectedEvent.id, name)}
            onUpdateEventDate={(date) => updateEventDate(selectedEvent.id, date)}
            onAutoCharge={() => autoCharge(selectedEvent.id)}
            onGenerateShareCode={() => generateShareCode(selectedEvent.id)}
            onToggleRegistration={() => toggleRegistration(selectedEvent.id)}
            onReorderItems={(from, to) => reorderItems(selectedEvent.id, from, to)}
            onReorderPersons={(from, to) => reorderPersons(selectedEvent.id, from, to)}
            onSelectPerson={handleSelectPerson}
            onAddTemplatePerson={addTemplatePerson}
            onRemoveTemplatePerson={removeTemplatePerson}
            onAddTemplateItem={addTemplateItem}
            onRemoveTemplateItem={removeTemplateItem}
          />
        )}

        {viewMode === 'statistics' && adminUnlocked && (
          <Statistics
            events={events}
            onBack={handleBack}
            onSelectPerson={handleSelectPerson}
          />
        )}

        {viewMode === 'person-profile' && adminUnlocked && selectedPersonName && (
          <PersonProfile
            personName={selectedPersonName}
            events={events}
            onBack={handleBack}
            onSelectEvent={handleSelectEvent}
          />
        )}
        {viewMode === 'guest-join' && (() => {
          const guestEvent = guestShareCode ? getEventByShareCode(guestShareCode) : null
          if (!guestEvent) return (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
              <p>Event nicht gefunden.</p>
              <p>Pruefe den Link oder frage den Veranstalter.</p>
            </div>
          )
          return (
            <GuestJoin
              event={guestEvent}
              allEvents={events}
              onAddPerson={(name, pin) => addPerson(guestEvent.id, name, pin)}
              onRemovePerson={(personId) => removePerson(guestEvent.id, personId)}
              onAddItem={(name) => addItem(guestEvent.id, name)}
              onSetOrderQuantity={(personId, itemId, qty) =>
                setOrderQuantity(guestEvent.id, personId, itemId, qty)
              }
            />
          )
        })()}
      </main>
    </div>
  )
}

export default App
