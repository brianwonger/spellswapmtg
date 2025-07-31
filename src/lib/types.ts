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
    quantity: number
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

export interface WishlistItem {
  id: string
  priority: string
  max_price: number | null
  preferred_condition: string
  foil_preference: string
  notes: string | null
  created_at: string
  default_cards: CardDetails
}

export interface MarketplaceListing {
  id: string;
  name: string;
  set: string;
  condition: string;
  price: number | null;
  seller: string;
  location: string | null;
  imageUrl: string;
  distance?: number;
  colors?: string[];
  cmc?: number;
  rarity?: string;
} 