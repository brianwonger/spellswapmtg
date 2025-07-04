import { Card } from "@/components/ui/card"
import { DollarSign, Library, Star, TrendingUp } from "lucide-react"

type CollectionStatsProps = {
  totalCards: number
  uniqueCards: number
  totalValue: number
  averageValue: number
}

export function CollectionStats({
  totalCards,
  uniqueCards,
  totalValue,
  averageValue,
}: CollectionStatsProps) {
  const stats = [
    {
      title: "Total Cards",
      value: totalCards.toLocaleString(),
      icon: Library,
      description: "Cards in your collection",
    },
    {
      title: "Unique Cards",
      value: uniqueCards.toLocaleString(),
      icon: Star,
      description: "Different cards owned",
    },
    {
      title: "Total Value",
      value: `$${totalValue.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      icon: DollarSign,
      description: "Collection market value",
    },
    {
      title: "Average Value",
      value: `$${averageValue.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      icon: TrendingUp,
      description: "Per card average",
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <Card key={stat.title} className="p-4">
            <div className="flex items-center gap-2">
              <Icon className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-medium text-sm text-muted-foreground">
                {stat.title}
              </h3>
            </div>
            <p className="text-2xl font-bold mt-2">{stat.value}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {stat.description}
            </p>
          </Card>
        )
      })}
    </div>
  )
} 