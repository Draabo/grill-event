import { EventsState } from '../types'

const STORAGE_KEY = 'grill-events'
const API_ENDPOINT = '/api/events'
const isDev = import.meta.env.DEV

function isElectron(): boolean {
  return !!window.electronAPI
}

export async function loadEvents(): Promise<EventsState> {
  if (isElectron()) {
    try {
      return await window.electronAPI!.loadEvents()
    } catch (err) {
      console.error('Electron load failed:', err)
    }
  }

  if (isDev) {
    try {
      const res = await fetch(API_ENDPOINT)
      if (res.ok) {
        return await res.json()
      }
    } catch {
      // Dev server not available
    }
  }

  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (data) return JSON.parse(data)
  } catch {
    // localStorage not available
  }

  return { events: [], templates: { persons: [], items: [] } }
}

export async function saveEvents(state: EventsState): Promise<void> {
  if (isElectron()) {
    try {
      await window.electronAPI!.saveEvents(state)
      return
    } catch (err) {
      console.error('Electron save failed:', err)
    }
  }

  if (isDev) {
    try {
      await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
      })
    } catch {
      // Dev server not available
    }
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // localStorage not available
  }
}
