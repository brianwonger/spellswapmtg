import Link from 'next/link'
import { Boxes, ShoppingCart, DollarSign, Heart } from 'lucide-react'

const FEATURES = [
  {
    id: 'collection-management',
    name: 'Collection Management',
    description:
      'Organize your Magic: The Gathering cards into decks, binders, and custom containers with granular metadata like quantity, condition, language, and foil status.',
    useCase:
      'You just bought a booster box and need to sort 540 fresh cards quickly—scan or bulk import them and instantly see where they best fit in your collection.',
    advantage:
      'SpellSwap links every card entry to real-time prices and collection analytics, something spreadsheets and generic inventory apps simply cannot replicate.',
    humor:
      "Because forgetting which binder your Black Lotus is hiding in should be a felony (or at least a game loss).",
    icon: Boxes,
  },
  {
    id: 'local-marketplace',
    name: 'Local Marketplace',
    description:
      'Discover nearby players listing cards for sale or trade. Browse by distance, condition, or price and close deals face-to-face—no postage required.',
    useCase:
      'Sara realizes she needs a playset of Lightning Bolts tonight. She filters listings within 10 km and messages a neighbor who has exactly four available.',
    advantage:
      'Our built-in geolocation and chat mean you can strike a deal in minutes instead of days, all without shipping anxiety or tracking numbers.',
    humor:
      'Stop mailing cards to the guy who lives across the street—your postman has enough on their plate.',
    icon: ShoppingCart,
  },
  {
    id: 'price-tracking',
    name: 'Price Tracking',
    description:
      'Stay ahead of the market with live price feeds, historical charts, and customizable alerts for every card you own or covet.',
    useCase:
      'Jake gets an alert that Ragavan, Nimble Pilferer has spiked 18%. He cashes out extras before the price settles and funds his next deck.',
    advantage:
      'Unlike general finance apps, SpellSwap ties prices directly to your actual inventory, so profit-tracking is automatic and contextual.',
    humor:
      'Because sometimes your cardboard is worth more than your car—best keep an eye on it.',
    icon: DollarSign,
  },
  {
    id: 'wishlist',
    name: 'Wishlist',
    description:
      'Create prioritized wishlists with target prices and set-and-forget alerts that ping you when matching listings appear—locally or online.',
    useCase:
      'Emma marks Doubling Season as “High Priority” with a $40 cap. Two days later she gets a notification that a player 5 km away listed one for $38.',
    advantage:
      'SpellSwap combines the wishlist with our marketplace and price engine, delivering one-tap purchasing faster than auction snipes or price-watch bots.',
    humor:
      "Because jotting card wants on a napkin is only cool until laundry day.",
    icon: Heart,
  },
] as const

export const metadata = {
  title: 'Features • SpellSwap',
  description:
    'Discover the powerful features that make managing and trading your Magic: The Gathering collection effortless.',
}

export default function FeaturesPage() {
  return (
    <div className="flex flex-col gap-20 py-12 lg:py-24">
      {/* Page header */}
      <header className="mx-auto max-w-3xl text-center flex flex-col gap-6">
        <h1 className="text-4xl font-bold sm:text-5xl">SpellSwap Features</h1>
        <p className="text-muted-foreground text-lg">
          Everything you need to trade, track, and grow your collection — all in one place.
        </p>
        {/* Quick anchor links */}
        <nav className="flex flex-wrap justify-center gap-4 mt-4">
          {FEATURES.map((f) => (
            <Link
              key={f.id}
              href={`#${f.id}`}
              className="text-sm font-medium hover:text-primary transition-colors underline-offset-4 hover:underline"
            >
              {f.name}
            </Link>
          ))}
        </nav>
      </header>

      {/* Feature sections */}
      <main className="mx-auto grid max-w-4xl gap-20">
        {FEATURES.map(({ id, name, description, useCase, advantage, humor, icon: Icon }) => (
          <section key={id} id={id} className="flex flex-col gap-6 scroll-mt-24">
            <div className="flex items-center gap-4">
              <Icon className="size-8 text-primary" aria-hidden="true" />
              <h2 className="text-2xl font-semibold">{name}</h2>
            </div>
            <p className="text-muted-foreground text-base/relaxed">{description}</p>
            <p>
              <strong>Use&nbsp;case:</strong> {useCase}
            </p>
            <p>
              <strong>Why&nbsp;SpellSwap?</strong> {advantage}
            </p>
            <p className="text-sm italic text-muted-foreground">{humor}</p>
          </section>
        ))}
      </main>
    </div>
  )
} 