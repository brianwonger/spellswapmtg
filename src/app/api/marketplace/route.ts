import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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
      }
    }

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

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
          mana_cost,
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

    const { data, error } = await query

    if (error) {
      console.error('Error fetching marketplace listings:', error)
      return NextResponse.json({ error: 'Failed to fetch listings' }, { status: 500 })
    }

    const listings = data
      .filter(listing => listing.profiles && listing.default_cards)
      .map((listing: any) => {
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

        return {
          id: listing.id,
          name: listing.default_cards.name,
          set: listing.default_cards.set_name,
          condition: listing.condition,
          price: listing.sale_price,
          seller: listing.profiles.display_name,
          location: listing.profiles.location_name,
          imageUrl: imageUris?.normal || imageUris?.large || null
        }
      })

    return NextResponse.json(listings)
  } catch (error) {
    console.error('Error in marketplace API route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 