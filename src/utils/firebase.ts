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

export async function saveToFirestore(state: EventsState): Promise<void> {
  if (!db) return
  console.log('[Firebase] Speichere Daten...')
  try {
    await setDoc(doc(db, COLLECTION, DOC_ID), {
      ...state,
      updatedAt: Date.now(),
    })
    console.log('[Firebase] Gespeichert!')
  } catch (err) {
    console.error('[Firebase] Speichern fehlgeschlagen:', err)
    throw err
  }
}

export function subscribeToFirestore(
  onData: (state: EventsState) => void,
  onError: (err: Error) => void,
): () => void {
  if (!db) return () => {}
  console.log('[Firebase] Subscribing to changes...')
  return onSnapshot(
    doc(db, COLLECTION, DOC_ID),
    (snap) => {
      if (snap.exists()) {
        console.log('[Firebase] Daten empfangen')
        const data = snap.data() as EventsState & { updatedAt?: number }
        const { updatedAt: _, ...state } = data
        onData(state)
      } else {
        console.log('[Firebase] Dokument existiert noch nicht — wird beim ersten Speichern erstellt')
      }
    },
    (err) => {
      console.error('[Firebase] Listener Fehler:', err)
      onError(err)
    }
  )
}
