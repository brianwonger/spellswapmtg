
import { createClient } from "./server";
import { MarketplaceListing } from "../types";

export async function getMarketplaceListings(): Promise<MarketplaceListing[]> {
  const supabase = await createClient();
  
  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log('Current user:', user?.id);

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
        image_uris
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

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching marketplace listings:', error);
    if (error.code === 'PGRST301') {
      console.error('This might be an RLS issue - check if you have the correct policies in place');
    }
    return [];
  }

  console.log('Found listings:', data?.length || 0);
  if (data?.length > 0) {
    console.log('Sample listing:', {
      id: data[0].id,
      user_id: data[0].user_id,
      has_profile: !!data[0].profiles,
      has_card_details: !!data[0].default_cards,
      image_uris: data[0].default_cards?.image_uris
    });
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
        imageUrl: imageUris?.normal || imageUris?.large || null // Use null instead of empty string as fallback
      };
    });

  return listings;
}

