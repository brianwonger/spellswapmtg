import { Button } from '@/components/ui/button'
import Link from 'next/link'
import Image from 'next/image'
import { Boxes, ShoppingCart, Heart, MessageCircle, UploadCloud, BarChart3 } from 'lucide-react'

const FEATURES = [
  {
    name: 'Manage Your Collection',
    description:
      'Organize decks, binders, and custom containers. Keep track of quantities, conditions, and more with powerful filters.',
    icon: Boxes,
  },
  {
    name: 'Never Pay Shipping',
    description:
      'Meet local traders and finalize deals in-person to skip postage fees and delivery delays.',
    icon: ShoppingCart,
  },
  {
    name: 'Wishlist & Price Tracking',
    description:
      'Stay on top of market movement with priority wishlists, price alerts, and historical data.',
    icon: Heart,
  },
  {
    name: 'Real-Time Messaging',
    description:
      'Coordinate trades effortlessly through an integrated chat built for traders.',
    icon: MessageCircle,
  },
  {
    name: 'Collection Analytics',
    description:
      'Understand your portfolio at a glance with interactive charts for value, rarity, color balance, and more.',
    icon: BarChart3,
  },
  {
    name: 'CSV Import & Bulk Uploads',
    description:
      'Kick-start your digital collection by importing from popular tools and spreadsheets in seconds.',
    icon: UploadCloud,
  },
] as const

const TESTIMONIALS = [
  {
    quote:
      'SpellSwap helped me offload duplicates within days and complete my Commander deck for half the cost!',
    name: 'Aria M.',
    role: 'EDH Enthusiast',
    location: 'Portland, OR',
  },
  {
    quote:
      "I've tried spreadsheets, apps, you name it. Nothing tracks my collection value as elegantly as SpellSwap.",
    name: 'Jonathan K.',
    role: 'Competitive Grinder',
    location: 'Toronto, ON',
  },
  {
    quote:
      'The built-in chat and local listings mean I never worry about shipping or scams. Five stars!',
    name: 'Sierra L.',
    role: 'Casual Trader',
    location: 'Sydney, AU',
  },
  {
    quote:
      'SpellSwap\'s analytics showed me my binder was worth way more than I thought—time to trade up!',
    name: 'Derek P.',
    role: 'Modern Player',
    location: 'Chicago, IL',
  },
  {
    quote:
      'Finally an app that actually makes trading easy during large events and GPs.',
    name: 'Michelle R.',
    role: 'Judge',
    location: 'Austin, TX',
  },
  {
    quote:
      'The wishlist alerts saved me hours hunting for staples online—now they come to me!',
    name: 'Lucas B.',
    role: 'Budget Brewer',
    location: 'Berlin, DE',
  },
] as const

export default function Home() {
  return (
    <div className="flex flex-col gap-20 pt-8 lg:pt-12 pb-16 lg:pb-24">
      {/* In-page quick links */}
      <nav className="flex justify-center gap-6 text-sm font-medium mb-4">
        <Link href="#features" className="hover:text-primary transition-colors">
          Features
        </Link>
        <Link href="#testimonials" className="hover:text-primary transition-colors">
          Testimonials
        </Link>
        <Link href="#stats" className="hover:text-primary transition-colors">
          Stats
        </Link>
      </nav>

      {/* Hero */}
      <section className="flex flex-col-reverse items-center gap-12 md:flex-row md:gap-16">
        {/* Text */}
        <div className="flex flex-col items-center text-center gap-8 md:items-start md:text-left md:w-1/2">
          <Image
            src="/images/cards_logo.png"
            alt="SpellSwap logo"
            width={120}
            height={120}
            className="dark:invert"
          />
          <h1 className="text-4xl/tight font-bold sm:text-5xl/tight lg:text-6xl/tight bg-gradient-to-br from-primary to-primary/70 bg-clip-text text-transparent">
            Trade. Collect. Connect.
          </h1>
          <p className="max-w-xl text-muted-foreground text-lg md:text-xl">
            SpellSwap is the all-in-one platform for Magic: The Gathering players to
            manage collections, discover local deals, and trade cards&nbsp;securely.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 mt-2">
            <Link href="/signup">
              <Button size="lg">Get Started</Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg">
                Log&nbsp;In
              </Button>
            </Link>
          </div>
        </div>

        {/* Image */}
        <div className="w-full md:w-1/2">
          <Image
            src="/images/ff1.jpg"
            alt="Magic cards spread out on a table"
            width={800}
            height={600}
            className="rounded-xl shadow-lg object-cover w-full h-auto"
            priority
          />
        </div>
      </section>

      {/* Features */}
      <section id="features" className="grid gap-12">
        <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
          Why SpellSwap?
        </h2>
        <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ name, description, icon: Icon }) => (
            <li
              key={name}
              className="flex flex-col gap-3 items-start rounded-lg border bg-card p-6 shadow-sm dark:bg-card/20"
            >
              <Icon className="size-8 text-primary" aria-hidden="true" />
              <h3 className="text-lg font-medium">{name}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="relative isolate flex flex-col gap-12 overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-background to-background/80 py-20 px-6 shadow-md md:px-12">
        <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
          Players Love&nbsp;SpellSwap
        </h2>
        <div className="grid gap-8 md:grid-cols-3">
          {TESTIMONIALS.map(({ quote, name, role, location }) => (
            <figure
              key={name}
              className="flex flex-col gap-4 rounded-lg bg-background/80 p-6 text-sm shadow-lg ring-1 ring-border/50 backdrop-blur"
            >
              <blockquote className="italic leading-relaxed text-lg before:content-['“'] before:text-primary before:text-3xl before:align-top after:content-['”'] after:text-primary after:text-3xl after:align-bottom">
                {quote}
              </blockquote>
              <figcaption className="mt-auto font-medium">
                {name}
                <span className="block text-muted-foreground font-normal text-xs">
                  {role} · {location}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* Site stats */}
      <section id="stats" className="grid gap-12">
        <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
          Our Community in&nbsp;Numbers
        </h2>
        <dl className="mx-auto grid max-w-3xl grid-cols-1 gap-8 sm:grid-cols-3 text-center">
          <div className="flex flex-col gap-1">
            <dt className="text-4xl font-bold">12,480</dt>
            <dd className="text-sm text-muted-foreground">Registered Users</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-4xl font-bold">3.2M</dt>
            <dd className="text-sm text-muted-foreground">Cards Managed</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-4xl font-bold">$45M</dt>
            <dd className="text-sm text-muted-foreground">Total Collection Value</dd>
          </div>
        </dl>
      </section>

      {/* Call to action */}
      <section className="flex flex-col items-center gap-6 rounded-xl bg-gradient-to-br from-primary to-primary/80 py-16 px-6 text-primary-foreground shadow-lg">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Ready to elevate your game?
        </h2>
        <p className="max-w-xl text-center text-base/relaxed opacity-90">
          Join thousands of Magic players using SpellSwap to simplify trading and
          keep collections up&nbsp;to&nbsp;date.
        </p>
        <Link href="/signup">
          <Button size="lg" variant="secondary">
            Create Your Free Account
          </Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="mt-16 border-t pt-10 text-sm">
        <div className="mx-auto grid max-w-6xl gap-8 sm:grid-cols-3">
          {/* Features */}
          <div>
            <h3 className="mb-4 font-semibold uppercase tracking-wide text-foreground">Features</h3>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <Link href="/features/collection-management" className="hover:text-primary">
                  Collection Management
                </Link>
              </li>
              <li>
                <Link href="/features/local-marketplace" className="hover:text-primary">
                  Local Marketplace
                </Link>
              </li>
              <li>
                <Link href="/features/price-tracking" className="hover:text-primary">
                  Price Tracking
                </Link>
              </li>
              <li>
                <Link href="/features/wishlist" className="hover:text-primary">
                  Wishlist
                </Link>
              </li>
            </ul>
          </div>

          {/* Community */}
          <div>
            <h3 className="mb-4 font-semibold uppercase tracking-wide text-foreground">Community</h3>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <Link href="/community/trading" className="hover:text-primary">
                  Trading
                </Link>
              </li>
              <li>
                <Link href="/community/reviews" className="hover:text-primary">
                  Reviews
                </Link>
              </li>
              <li>
                <Link href="/community/messaging" className="hover:text-primary">
                  Messaging
                </Link>
              </li>
              <li>
                <Link href="/community/local-events" className="hover:text-primary">
                  Local Events
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="mb-4 font-semibold uppercase tracking-wide text-foreground">Support</h3>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <Link href="/support/help-center" className="hover:text-primary">
                  Help Center
                </Link>
              </li>
              <li>
                <Link href="/support/contact" className="hover:text-primary">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/legal/terms" className="hover:text-primary">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/legal/privacy" className="hover:text-primary">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <p className="mt-10 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} SpellSwap. All rights reserved.
        </p>
      </footer>
    </div>
  )
}
