import { initializeApp } from 'firebase/app'
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore'
import { EventsState } from '../types'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const isConfigured = !!firebaseConfig.projectId

let db: ReturnType<typeof getFirestore> | null = null

if (isConfigured) {
  try {
    const app = initializeApp(firebaseConfig)
    db = getFirestore(app)
    console.log('[Firebase] Initialisiert mit Projekt:', firebaseConfig.projectId)
  } catch (err) {
    console.error('[Firebase] Init fehlgeschlagen:', err)
  }
} else {
  console.log('[Firebase] Nicht konfiguriert (keine .env Werte)')
}

const DOC_ID = 'grill-data'
const COLLECTION = 'app'

export function isFirebaseEnabled(): boolean {
  return isConfigured && db !== null
}

function stripUndefined(obj: unknown): unknown {
  if (obj === null || obj === undefined) return null
  if (Array.isArray(obj)) return obj.map(stripUndefined)
  if (typeof obj === 'object') {
    const clean: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      if (v !== undefined) clean[k] = stripUndefined(v)
    }
    return clean
  }
  return obj
}

export async function saveToFirestore(state: EventsState): Promise<void> {
  if (!db) return
  console.log('[Firebase] Speichere Daten...')
  try {
    const cleanState = stripUndefined({ ...state, updatedAt: Date.now() }) as Record<string, unknown>
    await setDoc(doc(db, COLLECTION, DOC_ID), cleanState)
    console.log('[Firebase] Gespeichert!')
  } catch (err) {
    console.error('[Firebase] Speichern fehlgeschlagen:', err)
    throw err
  }
}

export function subscribeToFirestore(
  onData: (state: EventsState | null) => void,
  onError: (err: Error) => void,
): () => void {
  if (!db) return () => {}
  console.log('[Firebase] Subscribing to changes...')
  return onSnapshot(
    doc(db, COLLECTION, DOC_ID),
    (snap) => {
      if (snap.exists()) {
        console.log('[Firebase] Daten empfangen')
        const data = snap.data()
        const state: EventsState = {
          events: data.events ?? [],
          templates: data.templates ?? { persons: [], items: [] },
          paypalUsername: data.paypalUsername,
          adminPin: data.adminPin,
        }
        onData(state)
      } else {
        console.log('[Firebase] Dokument existiert noch nicht — wird beim ersten Speichern erstellt')
        onData(null)
      }
    },
    (err) => {
      console.error('[Firebase] Listener Fehler:', err)
      onError(err)
    }
  )
}
