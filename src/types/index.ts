export interface Person {
  id: string
  name: string
  pin?: string
}

export interface GrillItem {
  id: string
  name: string
  totalPrice: number
}

export interface OrderEntry {
  personId: string
  itemId: string
  quantity: number
}

export interface PersonBilling {
  personId: string
  charged: number
  received: number
  note?: string
}

export interface GrillEvent {
  id: string
  name: string
  date: string
  shareCode?: string
  registrationOpen?: boolean
  persons: Person[]
  items: GrillItem[]
  orders: OrderEntry[]
  billing: PersonBilling[]
}

export interface SavedTemplates {
  persons: string[]
  items: string[]
}

export interface EventsState {
  events: GrillEvent[]
  templates: SavedTemplates
  paypalUsername?: string
  adminPin?: string
}

export type ViewMode = 'overview' | 'event-detail' | 'statistics' | 'person-profile' | 'guest-join'
