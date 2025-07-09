export interface CardDetails {
  id: string
  name: string
  type_line: string
  oracle_text: string
  flavor_text?: string
  image_uris: string | null
  set_name: string
  prices?: {
    usd?: string
  }
  rarity: string
}

export interface UserCard {
  id: string
  quantity: number
  condition: string
  foil: boolean
  notes: string | null
  is_for_sale: boolean
  sale_price: number | null
  default_cards: CardDetails
  container_items?: {
    id: string
    container_id: string
    containers: {
      id: string
      name: string
      container_type: string
      is_default: boolean
    }
  }[]
}

export interface Container {
  id: string
  name: string
  container_type: string
  is_default: boolean
} 