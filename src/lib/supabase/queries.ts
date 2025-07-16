
import { createClient } from "./client";
import { MarketplaceListing } from "../types";

interface MarketplaceFilters {
  colors?: string[];
  manaCosts?: string[];
  format?: string;
  setName?: string;
  rarity?: string[];
  priceRange?: {
    min?: string;
    max?: string;
  };
}

export async function getMarketplaceListings(filters?: MarketplaceFilters): Promise<MarketplaceListing[]> {
  const supabase = createClient();
  
  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Build the base query
  let query = supabase
    .from('user_cards')
    .select(`
      id,
      user_id,
      is_for_sale,
      sale_price,
      condition,
      notes,
      default_cards (
        id,
        name,
        set_name,
        image_uris,
        colors,
        cmc,
        rarity,
        legalities
      ),
      profiles (
        id,
        display_name,
        location_name
      )
    `)
    .eq('is_for_sale', true);

  // Add user filter if logged in
  if (user) {
    query = query.neq('user_id', user.id);
  }

  // Apply filters if provided
  if (filters) {
    // Filter by colors
    if (filters.colors && filters.colors.length > 0) {
      query = query.contains('default_cards.colors', filters.colors);
    }

    // Filter by mana cost
    if (filters.manaCosts && filters.manaCosts.length > 0) {
      const maxCost = Math.max(...filters.manaCosts.map(cost => cost === '6+' ? 6 : parseInt(cost)));
      if (maxCost === 6) {
        query = query.gte('default_cards.cmc', 6);
      } else {
        query = query.in('default_cards.cmc', filters.manaCosts.map(cost => parseInt(cost)));
      }
    }

    // Filter by format
    if (filters.format) {
      query = query.eq(`default_cards.legalities->>${filters.format.toLowerCase()}`, 'legal');
    }

    // Filter by set name
    if (filters.setName) {
      query = query.ilike('default_cards.set_name', `%${filters.setName}%`);
    }

    // Filter by rarity
    if (filters.rarity && filters.rarity.length > 0) {
      query = query.in('default_cards.rarity', filters.rarity.map(r => r.toLowerCase()));
    }

    // Filter by price range
    if (filters.priceRange) {
      if (filters.priceRange.min) {
        query = query.gte('sale_price', parseFloat(filters.priceRange.min));
      }
      if (filters.priceRange.max) {
        query = query.lte('sale_price', parseFloat(filters.priceRange.max));
      }
    }
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching marketplace listings:', error);
    if (error.code === 'PGRST301') {
      console.error('This might be an RLS issue - check if you have the correct policies in place');
    }
    return [];
  }

  const listings: MarketplaceListing[] = data
    .filter(listing => listing.profiles && listing.default_cards)
    .map((listing: any) => {
      // Parse image_uris if it's a string
      let imageUris;
      try {
        imageUris = typeof listing.default_cards.image_uris === 'string' 
          ? JSON.parse(listing.default_cards.image_uris)
          : listing.default_cards.image_uris;
      } catch (e) {
        console.error('Error parsing image_uris:', e);
        imageUris = null;
      }

      return {
        id: listing.id,
        name: listing.default_cards.name,
        set: listing.default_cards.set_name,
        condition: listing.condition,
        price: listing.sale_price,
        seller: listing.profiles.display_name,
        location: listing.profiles.location_name,
        imageUrl: imageUris?.normal || imageUris?.large || null
      };
    });

  return listings;
}

