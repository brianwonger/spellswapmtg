import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from '@/components/ui/button'
import { PlusCircle, TrendingUp, Package, ListChecks, Library, Star, DollarSign } from 'lucide-react'
import Link from 'next/link'

interface CardWithPrices {
  quantity: number
  default_cards: {
    prices: {
      usd?: string
    }
  }
}

interface Activity {
  id: string
  activity_type: string
  description: string
  metadata: any
  created_at: string
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get total cards count
  const { data: totalCardsData, error: totalCardsError } = await supabase
    .from('user_cards')
    .select('quantity')
    .eq('user_id', user.id)

  const totalCards = totalCardsData?.reduce((sum, card) => sum + (card.quantity || 0), 0) || 0

  // Get unique cards count
  const { count: uniqueCards, error: uniqueCardsError } = await supabase
    .from('user_cards')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)

  // Get collection value
  const { data: cardsWithPrices, error: valueError } = await supabase
    .from('user_cards')
    .select(`
      quantity,
      default_cards (
        prices
      )
    `)
    .eq('user_id', user.id) as { data: CardWithPrices[] | null, error: any }

  const totalValue = cardsWithPrices?.reduce((sum, card) => {
    const price = parseFloat(card.default_cards?.prices?.usd || '0')
    return sum + (price * card.quantity)
  }, 0) || 0

  // Calculate average value per card
  const averageValue = totalCards > 0 ? totalValue / totalCards : 0

  // Get recently added cards (last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: recentCardsData, error: recentError } = await supabase
    .from('user_cards')
    .select('quantity')
    .eq('user_id', user.id)
    .gte('created_at', thirtyDaysAgo.toISOString())

  const recentlyAdded = recentCardsData?.reduce((sum, card) => sum + (card.quantity || 0), 0) || 0

  // Get active listings
  const { data: activeListingsData, error: listingsError } = await supabase
    .from('user_cards')
    .select('quantity')
    .eq('user_id', user.id)
    .eq('is_for_sale', true)

  const activeListings = activeListingsData?.reduce((sum, card) => sum + (card.quantity || 0), 0) || 0

  // Get recent activities
  const { data: activities, error: activitiesError } = await supabase
    .from('user_activities')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5) as { data: Activity[] | null, error: any }

  return (
    <div className="container py-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cards</CardTitle>
            <Library className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCards.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Cards in your collection
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Cards</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueCards?.toLocaleString() || '0'}</div>
            <p className="text-xs text-muted-foreground">
              Different cards owned
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalValue.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Collection market value
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${averageValue.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Per card average
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recently Added</CardTitle>
            <PlusCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentlyAdded}</div>
            <p className="text-xs text-muted-foreground">
              Cards added in the last 30 days
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Listings</CardTitle>
            <ListChecks className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeListings}</div>
            <p className="text-xs text-muted-foreground">
              Cards currently listed for sale
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest actions and updates</CardDescription>
          </CardHeader>
          <CardContent>
            {activities && activities.length > 0 ? (
              <div className="space-y-4">
                {activities.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{activity.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(activity.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground mb-4">No recent activity</p>
                <Link href="/collection/add">
                  <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Cards
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 