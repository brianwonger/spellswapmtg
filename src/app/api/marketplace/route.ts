import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Function to calculate distance between two points using Haversine formula
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const filters = {
      colors: searchParams.get('colors')?.split(',').filter(Boolean),
      manaCosts: searchParams.get('manaCosts')?.split(',').filter(Boolean),
      format: searchParams.get('format'),
      setName: searchParams.get('setName'),
      rarity: searchParams.get('rarity')?.split(',').filter(Boolean),
      priceRange: {
        min: searchParams.get('priceMin'),
        max: searchParams.get('priceMax')
      },
      seller: searchParams.get('seller'),
      search: searchParams.get('search')
    }

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Get current user's coordinates if logged in
    let userCoordinates: { lat: number; lng: number } | null = null
    if (user) {
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('location_coordinates')
        .eq('id', user.id)
        .single()

      if (userProfile?.location_coordinates) {
        // Extract coordinates using PostGIS function
        const { data: coordsData } = await supabase
          .rpc('get_coordinates', { point: userProfile.location_coordinates })

        if (coordsData && coordsData.length > 0) {
          userCoordinates = { lat: coordsData[0].lat, lng: coordsData[0].lng }
        }
      }
    }

    // Build the base query - now include location_coordinates
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
          mana_cost,
          cmc,
          rarity,
          legalities
        ),
        profiles (
          id,
          display_name,
          location_name,
          location_coordinates
        )
      `)
      .eq('is_for_sale', true)

    // Add user filter if logged in
    if (user) {
      query = query.neq('user_id', user.id)
    }

    // Apply filters if provided
    if (filters.colors?.length) {
      // Build an OR filter string for the `colors` jsonb array in the foreign table.
      // The `cs` operator means "contains". The value must be a JSON array string.
      const orFilter = filters.colors
        .map((color) => `colors.cs.["${color}"]`)
        .join(",");
      query = query.or(orFilter, { foreignTable: "default_cards" });
    }

    if (filters.manaCosts?.length) {
      const maxCost = Math.max(...filters.manaCosts.map(cost => cost === '6+' ? 6 : parseInt(cost)))
      if (maxCost === 6) {
        query = query.gte('default_cards.cmc', 6)
      } else {
        query = query.in('default_cards.cmc', filters.manaCosts.map(cost => parseInt(cost)))
      }
    }

    if (filters.format) {
      query = query.eq(`default_cards.legalities->>${filters.format.toLowerCase()}`, 'legal')
    }

    if (filters.setName) {
      query = query.ilike('default_cards.set_name', `%${filters.setName}%`)
    }

    if (filters.rarity?.length) {
      query = query.in('default_cards.rarity', filters.rarity.map(r => r.toLowerCase()))
    }

    if (filters.priceRange.min) {
      query = query.gte('sale_price', parseFloat(filters.priceRange.min))
    }

    if (filters.priceRange.max) {
      query = query.lte('sale_price', parseFloat(filters.priceRange.max))
    }

    // Filter by seller name
    if (filters.seller) {
      query = query.eq('profiles.display_name', filters.seller)
    }

    // Filter by search term in card name or set name
    if (filters.search) {
      const searchTerm = `%${filters.search}%`
      query = query.or(`default_cards.name.ilike.${searchTerm},default_cards.set_name.ilike.${searchTerm}`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching marketplace listings:', error)
      return NextResponse.json({ error: 'Failed to fetch listings' }, { status: 500 })
    }

    const listings = await Promise.all(
      data
        .filter(listing => listing.profiles && listing.default_cards)
        .map(async (listing: any) => {
          // Parse image_uris if it's a string
          let imageUris
          try {
            imageUris = typeof listing.default_cards.image_uris === 'string'
              ? JSON.parse(listing.default_cards.image_uris)
              : listing.default_cards.image_uris
          } catch (e) {
            console.error('Error parsing image_uris:', e)
            imageUris = null
          }

          // Calculate distance if both user and seller have coordinates
          let distance: number | undefined = undefined
          if (userCoordinates && listing.profiles.location_coordinates) {
            try {
              // Extract seller coordinates using PostGIS function
              const { data: sellerCoordsData } = await supabase
                .rpc('get_coordinates', { point: listing.profiles.location_coordinates })

              if (sellerCoordsData && sellerCoordsData.length > 0) {
                const sellerCoords = { lat: sellerCoordsData[0].lat, lng: sellerCoordsData[0].lng }
                distance = calculateDistance(
                  userCoordinates.lat,
                  userCoordinates.lng,
                  sellerCoords.lat,
                  sellerCoords.lng
                )
              }
            } catch (error) {
              console.error('Error calculating distance:', error)
            }
          }

          return {
            id: listing.id,
            name: listing.default_cards.name,
            set: listing.default_cards.set_name,
            condition: listing.condition,
            price: listing.sale_price,
            seller: listing.profiles.display_name,
            location: listing.profiles.location_name,
            distance: distance,
            imageUrl: imageUris?.normal || imageUris?.large || null,
            colors: listing.default_cards.colors,
            cmc: listing.default_cards.cmc,
            rarity: listing.default_cards.rarity
          }
        })
    )

    return NextResponse.json(listings)
  } catch (error) {
    console.error('Error in marketplace API route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 