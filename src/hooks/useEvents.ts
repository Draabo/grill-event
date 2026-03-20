import { useState, useEffect, useCallback, useRef } from 'react'
import { GrillEvent, Person, GrillItem, OrderEntry, PersonBilling, SavedTemplates } from '../types'
import { loadEvents, saveEvents } from '../utils/storage'
import { isFirebaseEnabled, saveToFirestore, subscribeToFirestore } from '../utils/firebase'
import { generateId } from '../utils/format'

const DEFAULT_TEMPLATES: SavedTemplates = { persons: [], items: [] }

function migrateEvents(events: GrillEvent[]): GrillEvent[] {
  return events.map((e) => ({
    ...e,
    items: e.items ?? [],
    orders: e.orders ?? [],
    billing: e.billing ?? [],
    persons: e.persons ?? [],
  }))
}

export function useEvents() {
  const [events, setEvents] = useState<GrillEvent[]>([])
  const [templates, setTemplates] = useState<SavedTemplates>(DEFAULT_TEMPLATES)
  const [paypalUsername, setPaypalUsername] = useState('')
  const [adminPin, setAdminPin] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [firebaseReady, setFirebaseReady] = useState(!isFirebaseEnabled())
  const [syncStatus, setSyncStatus] = useState<'off' | 'connected' | 'syncing' | 'error'>('off')
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedHash = useRef('')

  const makeHash = (state: { events: GrillEvent[]; templates: SavedTemplates; paypalUsername?: string; adminPin?: string }) => {
    return JSON.stringify({
      events: state.events,
      templates: state.templates,
      paypalUsername: state.paypalUsername ?? '',
      adminPin: state.adminPin ?? '',
    })
  }

  // Initial load
  useEffect(() => {
    loadEvents().then((state) => {
      setEvents(migrateEvents(state.events ?? []))
      setTemplates(state.templates ?? DEFAULT_TEMPLATES)
      setPaypalUsername(state.paypalUsername ?? '')
      setAdminPin(state.adminPin ?? '')
      setLoaded(true)
    })
  }, [])

  // Subscribe to Firestore real-time updates
  useEffect(() => {
    if (!loaded || !isFirebaseEnabled()) return
    const unsubscribe = subscribeToFirestore(
      (state) => {
        setFirebaseReady(true)
        if (!state) {
          setSyncStatus('connected')
          return
        }
        const hash = makeHash(state)
        // Ignore if data is same as what we last saved
        if (hash === lastSavedHash.current) {
          setSyncStatus('connected')
          return
        }
        lastSavedHash.current = hash
        setEvents(migrateEvents(state.events ?? []))
        setTemplates(state.templates ?? DEFAULT_TEMPLATES)
        setPaypalUsername(state.paypalUsername ?? '')
        setAdminPin(state.adminPin ?? '')
        setSyncStatus('connected')
      },
      () => {
        setFirebaseReady(true)
        setSyncStatus('error')
      }
    )
    return () => { unsubscribe() }
  }, [loaded])

  // Save on changes (local + Firestore)
  useEffect(() => {
    if (!loaded) return
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(async () => {
      const state = { events, templates, ...(paypalUsername ? { paypalUsername } : {}), ...(adminPin ? { adminPin } : {}) }
      const hash = makeHash({ events, templates, paypalUsername, adminPin })
      // Skip save if nothing changed
      if (hash === lastSavedHash.current) return
      lastSavedHash.current = hash
      saveEvents(state)
      if (isFirebaseEnabled()) {
        setSyncStatus('syncing')
        try {
          await saveToFirestore(state)
          setSyncStatus('connected')
        } catch (err) {
          console.error('[Sync] Save failed:', err)
          setSyncStatus('error')
        }
      }
    }, 1000)
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [events, templates, paypalUsername, adminPin, loaded])

  // --- Templates ---

  const addTemplatePerson = useCallback((name: string) => {
    setTemplates((prev) => {
      if (prev.persons.includes(name)) return prev
      return { ...prev, persons: [...prev.persons, name] }
    })
  }, [])

  const removeTemplatePerson = useCallback((name: string) => {
    setTemplates((prev) => ({
      ...prev,
      persons: prev.persons.filter((p) => p !== name),
    }))
  }, [])

  const addTemplateItem = useCallback((name: string) => {
    setTemplates((prev) => {
      if (prev.items.includes(name)) return prev
      return { ...prev, items: [...prev.items, name] }
    })
  }, [])

  const removeTemplateItem = useCallback((name: string) => {
    setTemplates((prev) => ({
      ...prev,
      items: prev.items.filter((i) => i !== name),
    }))
  }, [])

  // --- Events ---

  const addEvent = useCallback((name: string, date: string) => {
    const newEvent: GrillEvent = {
      id: generateId(),
      name,
      date,
      persons: [],
      items: [],
      orders: [],
      billing: [],
    }
    setEvents((prev) => [...prev, newEvent])
    return newEvent.id
  }, [])

  const deleteEvent = useCallback((eventId: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== eventId))
  }, [])

  const duplicateEvent = useCallback((eventId: string) => {
    setEvents((prev) => {
      const source = prev.find((e) => e.id === eventId)
      if (!source) return prev
      const today = new Date().toISOString().slice(0, 10)
      const newEvent: GrillEvent = {
        id: generateId(),
        name: source.name + ' (Kopie)',
        date: today,
        persons: source.persons.map((p) => ({ ...p, id: generateId() })),
        items: [],
        orders: [],
        billing: [],
      }
      return [...prev, newEvent]
    })
  }, [])

  const updateEventName = useCallback((eventId: string, name: string) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === eventId ? { ...e, name } : e))
    )
  }, [])

  const updateEventDate = useCallback((eventId: string, date: string) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === eventId ? { ...e, date } : e))
    )
  }, [])

  const updatePersonName = useCallback((eventId: string, personId: string, name: string) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === eventId
          ? { ...e, persons: e.persons.map((p) => (p.id === personId ? { ...p, name } : p)) }
          : e
      )
    )
  }, [])

  const updateItemName = useCallback((eventId: string, itemId: string, name: string) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === eventId
          ? { ...e, items: e.items.map((i) => (i.id === itemId ? { ...i, name } : i)) }
          : e
      )
    )
  }, [])

  const reorderItems = useCallback((eventId: string, fromIndex: number, toIndex: number) => {
    setEvents((prev) =>
      prev.map((e) => {
        if (e.id !== eventId) return e
        const newItems = [...e.items]
        const [moved] = newItems.splice(fromIndex, 1)
        newItems.splice(toIndex, 0, moved)
        return { ...e, items: newItems }
      })
    )
  }, [])

  const reorderPersons = useCallback((eventId: string, fromIndex: number, toIndex: number) => {
    setEvents((prev) =>
      prev.map((e) => {
        if (e.id !== eventId) return e
        const newPersons = [...e.persons]
        const [moved] = newPersons.splice(fromIndex, 1)
        newPersons.splice(toIndex, 0, moved)
        return { ...e, persons: newPersons }
      })
    )
  }, [])

  const addPerson = useCallback((eventId: string, name: string, pin?: string) => {
    const person: Person = { id: generateId(), name, ...(pin ? { pin } : {}) }
    setEvents((prev) =>
      prev.map((e) =>
        e.id === eventId ? { ...e, persons: [...e.persons, person] } : e
      )
    )
  }, [])

  const removePerson = useCallback((eventId: string, personId: string) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === eventId
          ? {
              ...e,
              persons: e.persons.filter((p) => p.id !== personId),
              orders: e.orders.filter((o) => o.personId !== personId),
              billing: e.billing.filter((b) => b.personId !== personId),
            }
          : e
      )
    )
  }, [])

  const addItem = useCallback((eventId: string, name: string) => {
    setEvents((prev) => {
      // Find last known price for this item name from other events
      let lastPrice = 0
      for (let i = prev.length - 1; i >= 0; i--) {
        if (prev[i].id === eventId) continue
        const found = prev[i].items.find((it) => it.name.toLowerCase() === name.toLowerCase())
        if (found && found.totalPrice > 0) {
          lastPrice = found.totalPrice
          break
        }
      }
      const item: GrillItem = { id: generateId(), name, totalPrice: lastPrice }
      return prev.map((e) =>
        e.id === eventId ? { ...e, items: [...e.items, item] } : e
      )
    })
  }, [])

  const removeItem = useCallback((eventId: string, itemId: string) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === eventId
          ? {
              ...e,
              items: e.items.filter((i) => i.id !== itemId),
              orders: e.orders.filter((o) => o.itemId !== itemId),
            }
          : e
      )
    )
  }, [])

  const setItemTotalPrice = useCallback(
    (eventId: string, itemId: string, totalPrice: number) => {
      setEvents((prev) =>
        prev.map((e) =>
          e.id === eventId
            ? {
                ...e,
                items: e.items.map((i) =>
                  i.id === itemId ? { ...i, totalPrice } : i
                ),
              }
            : e
        )
      )
    },
    []
  )

  const setOrderQuantity = useCallback(
    (eventId: string, personId: string, itemId: string, quantity: number) => {
      setEvents((prev) =>
        prev.map((e) => {
          if (e.id !== eventId) return e
          const existing = e.orders.find(
            (o) => o.personId === personId && o.itemId === itemId
          )
          let newOrders: OrderEntry[]
          if (existing) {
            if (quantity === 0) {
              newOrders = e.orders.filter(
                (o) => !(o.personId === personId && o.itemId === itemId)
              )
            } else {
              newOrders = e.orders.map((o) =>
                o.personId === personId && o.itemId === itemId
                  ? { ...o, quantity }
                  : o
              )
            }
          } else if (quantity > 0) {
            newOrders = [...e.orders, { personId, itemId, quantity }]
          } else {
            return e
          }
          return { ...e, orders: newOrders }
        })
      )
    },
    []
  )

  const updateBilling = useCallback(
    (eventId: string, personId: string, updates: Partial<PersonBilling>) => {
      setEvents((prev) => {
        return prev.map((e) => {
          if (e.id !== eventId) return e
          const existing = e.billing.find((b) => b.personId === personId)
          if (existing) {
            return {
              ...e,
              billing: e.billing.map((b) =>
                b.personId === personId ? { ...b, ...updates } : b
              ),
            }
          }
          return {
            ...e,
            billing: [
              ...e.billing,
              { personId, charged: 0, received: 0, ...updates },
            ],
          }
        })
      })
    },
    []
  )

  const markPersonPaid = useCallback((personName: string) => {
    setEvents((prev) =>
      prev.map((e) => {
        const person = e.persons.find((p) => p.name === personName)
        if (!person) return e
        const billing = e.billing.find((b) => b.personId === person.id)
        if (!billing || billing.note) return e
        if (billing.charged <= 0 || billing.received >= billing.charged) return e
        return {
          ...e,
          billing: e.billing.map((b) =>
            b.personId === person.id ? { ...b, received: b.charged } : b
          ),
        }
      })
    )
  }, [])

  const dismissDebt = useCallback((personName: string) => {
    // Set note: 'erlassen' on all CURRENT open billing entries for this person
    setEvents((prev) =>
      prev.map((e) => {
        const person = e.persons.find((p) => p.name === personName)
        if (!person) return e
        const billing = e.billing.find((b) => b.personId === person.id)
        if (!billing || billing.note) return e
        if (billing.charged <= 0 || billing.received > 0) return e
        return {
          ...e,
          billing: e.billing.map((b) =>
            b.personId === person.id ? { ...b, note: 'erlassen' } : b
          ),
        }
      })
    )
  }, [])

  const toggleRegistration = useCallback((eventId: string) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === eventId ? { ...e, registrationOpen: !e.registrationOpen } : e
      )
    )
  }, [])

  const generateShareCode = useCallback((eventId: string) => {
    setEvents((prev) =>
      prev.map((e) => {
        if (e.id !== eventId || e.shareCode) return e
        const code = e.name
          .replace(/[^a-zA-Z0-9]/g, '')
          .toUpperCase()
          .slice(0, 8) + '-' + Math.random().toString(36).slice(2, 6).toUpperCase()
        return { ...e, shareCode: code, registrationOpen: true }
      })
    )
  }, [])

  const getEventByShareCode = useCallback((code: string) => {
    return events.find((e) => e.shareCode === code) ?? null
  }, [events])

  const autoCharge = useCallback((eventId: string) => {
    setEvents((prev) =>
      prev.map((e) => {
        if (e.id !== eventId) return e
        const getItemTot = (itemId: string) =>
          e.orders.filter((o) => o.itemId === itemId).reduce((s, o) => s + o.quantity, 0)
        const getUnit = (item: GrillItem) => {
          const tot = getItemTot(item.id)
          return tot === 0 ? (item.totalPrice > 0 ? item.totalPrice : 0) : item.totalPrice / tot
        }
        const getCost = (personId: string) =>
          e.items.reduce((s, item) => {
            const qty = e.orders.find((o) => o.personId === personId && o.itemId === item.id)?.quantity ?? 0
            return s + qty * getUnit(item)
          }, 0)

        const newBilling = e.persons.map((p) => {
          const existing = e.billing.find((b) => b.personId === p.id)
          if (p.name.toLowerCase() === 'ich') return existing ?? { personId: p.id, charged: 0, received: 0 }
          const cost = getCost(p.id)
          const charged = Math.ceil(cost * 2) / 2 // round up to nearest .50
          return { personId: p.id, charged, received: existing?.received ?? 0, note: existing?.note }
        })
        return { ...e, billing: newBilling }
      })
    )
  }, [])

  return {
    events,
    templates,
    paypalUsername,
    setPaypalUsername,
    adminPin,
    setAdminPin,
    firebaseReady,
    syncStatus,
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
    toggleRegistration,
    generateShareCode,
    getEventByShareCode,
    reorderItems,
    reorderPersons,
    addTemplatePerson,
    removeTemplatePerson,
    addTemplateItem,
    removeTemplateItem,
  }
}
