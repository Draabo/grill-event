import { useState, useCallback } from 'react'
import { ViewMode } from './types'
import { useEvents } from './hooks/useEvents'
import { Overview } from './components/overview'
import { EventDetail } from './components/events'
import { Statistics } from './components/statistics'
import { PersonProfile } from './components/person'
import './App.css'

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('overview')
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [selectedPersonName, setSelectedPersonName] = useState<string | null>(null)

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
    dismissedDebts,
    dismissDebt,
    markPersonPaid,
    autoCharge,
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
      <header className="app-header">
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
      </header>

      <main className="app-main">
        {viewMode === 'overview' && (
          <Overview
            events={events}
            onSelectEvent={handleSelectEvent}
            onAddEvent={addEvent}
            onDeleteEvent={deleteEvent}
            onDuplicateEvent={duplicateEvent}
            onShowStatistics={handleShowStatistics}
            onSelectPerson={handleSelectPerson}
            dismissedDebts={dismissedDebts}
            onDismissDebt={dismissDebt}
            onMarkPersonPaid={markPersonPaid}
            paypalUsername={paypalUsername}
            onSetPaypalUsername={setPaypalUsername}
          />
        )}

        {viewMode === 'event-detail' && selectedEvent && (
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
            onReorderItems={(from, to) => reorderItems(selectedEvent.id, from, to)}
            onReorderPersons={(from, to) => reorderPersons(selectedEvent.id, from, to)}
            onSelectPerson={handleSelectPerson}
            onAddTemplatePerson={addTemplatePerson}
            onRemoveTemplatePerson={removeTemplatePerson}
            onAddTemplateItem={addTemplateItem}
            onRemoveTemplateItem={removeTemplateItem}
          />
        )}

        {viewMode === 'statistics' && (
          <Statistics
            events={events}
            onBack={handleBack}
            onSelectPerson={handleSelectPerson}
          />
        )}

        {viewMode === 'person-profile' && selectedPersonName && (
          <PersonProfile
            personName={selectedPersonName}
            events={events}
            onBack={handleBack}
            onSelectEvent={handleSelectEvent}
          />
        )}
      </main>
    </div>
  )
}

export default App
