import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MapPin, Star, Shield, Settings } from "lucide-react"

// Mock data for initial development
const mockProfile = {
  username: "MTGCollector",
  email: "user@example.com",
  location: "New York, NY",
  joinDate: "January 2024",
  rating: 4.8,
  totalReviews: 25,
  completedTrades: 42,
  tradingPreferences: {
    meetupPreferred: true,
    shippingAvailable: true,
    preferredLocation: "Local Card Shop",
    minCardValue: 5,
  },
}

export default function ProfilePage() {
  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Profile</h1>
        <Button variant="outline">
          <Settings className="h-4 w-4 mr-2" />
          Edit Profile
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* User Info */}
        <Card>
          <CardHeader>
            <CardTitle>User Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Username</Label>
              <Input value={mockProfile.username} readOnly />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={mockProfile.email} readOnly />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{mockProfile.location}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Member Since</Label>
              <div>{mockProfile.joinDate}</div>
            </div>
          </CardContent>
        </Card>

        {/* Trading Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Trading Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" />
              <span className="font-medium">{mockProfile.rating}</span>
              <span className="text-muted-foreground">
                ({mockProfile.totalReviews} reviews)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-500" />
              <span>{mockProfile.completedTrades} successful trades</span>
            </div>
          </CardContent>
        </Card>

        {/* Trading Preferences */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Trading Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Preferred Meeting Location</Label>
                <Select defaultValue={mockProfile.tradingPreferences.preferredLocation}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Local Card Shop">Local Card Shop</SelectItem>
                    <SelectItem value="Coffee Shop">Coffee Shop</SelectItem>
                    <SelectItem value="Library">Library</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Minimum Card Value</Label>
                <Select defaultValue={mockProfile.tradingPreferences.minCardValue.toString()}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">$1</SelectItem>
                    <SelectItem value="5">$5</SelectItem>
                    <SelectItem value="10">$10</SelectItem>
                    <SelectItem value="20">$20</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Trading Methods</Label>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={mockProfile.tradingPreferences.meetupPreferred}
                      readOnly
                    />
                    <span>In-person meetup</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={mockProfile.tradingPreferences.shippingAvailable}
                      readOnly
                    />
                    <span>Shipping available</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 