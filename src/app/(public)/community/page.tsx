import Link from 'next/link'
import { Hand, Star, MessageCircle } from 'lucide-react'

const TOPICS = [
  {
    id: 'trading',
    name: 'Trading',
    description:
      'Connect with nearby players or trusted users worldwide to swap cards safely and efficiently.',
    useCase:
      'Alex needs two Fetch Lands before Friday Night Magic. He finalizes a trade in-app and meets up after work, saving on shipping and waiting time.',
    advantage:
      'Built-in reputation scores, escrow options, and geolocation remove the usual risks associated with forum or social-media trades.',
    humor:
      'Because yelling "HAVE LIST / WANT LIST" across the table stopped being cool circa 2003.',
    icon: Hand,
  },
  {
    id: 'reviews',
    name: 'Reviews',
    description:
      'Leave and read detailed feedback after every transaction to foster a trustworthy marketplace.',
    useCase:
      'After a smooth sale, Jamie rates the seller 5 stars and adds a comment about lightning-fast communication.',
    advantage:
      'Transparent, immutable reviews encourage good behavior and help you avoid shady deals before they happen.',
    humor:
      "Because your cards deserve five-star treatment—even if you don't always sleeve them.",
    icon: Star,
  },
  {
    id: 'messaging',
    name: 'Messaging',
    description:
      'Real-time chat tailored for card trading with quick-add card references and automated meet-up suggestions.',
    useCase:
      'Chris drops a card link in chat and the app automatically shows price data so both parties agree on fair value instantly.',
    advantage:
      'No need to juggle social apps; everything stays within SpellSwap, complete with notifications and deal history.',
    humor:
      'Because sending carrier pigeons with decklists is surprisingly unreliable.',
    icon: MessageCircle,
  },
] as const

export const metadata = {
  title: 'Community • SpellSwap',
  description: 'Explore the community-driven features that keep SpellSwap social and secure.',
}

export default function CommunityPage() {
  return (
    <div className="flex flex-col gap-20 py-12 lg:py-24">
      {/* Page header */}
      <header className="mx-auto max-w-3xl text-center flex flex-col gap-6">
        <h1 className="text-4xl font-bold sm:text-5xl">SpellSwap Community</h1>
        <p className="text-muted-foreground text-lg">
          Trading cards is better together—see how our community tools keep deals smooth and players connected.
        </p>
        {/* Quick anchor links */}
        <nav className="flex flex-wrap justify-center gap-4 mt-4">
          {TOPICS.map((t) => (
            <Link
              key={t.id}
              href={`#${t.id}`}
              className="text-sm font-medium hover:text-primary transition-colors underline-offset-4 hover:underline"
            >
              {t.name}
            </Link>
          ))}
        </nav>
      </header>

      {/* Topic sections */}
      <main className="mx-auto grid max-w-4xl gap-20">
        {TOPICS.map(({ id, name, description, useCase, advantage, humor, icon: Icon }) => (
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