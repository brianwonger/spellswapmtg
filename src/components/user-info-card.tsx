'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { MapPin, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import dynamic from 'next/dynamic'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Dynamically import map components with no SSR
const MapContainer = dynamic(
  () => import('react-leaflet').then(mod => mod.MapContainer),
  { ssr: false }
)
const TileLayer = dynamic(
  () => import('react-leaflet').then(mod => mod.TileLayer),
  { ssr: false }
)
const Marker = dynamic(
  () => import('react-leaflet').then(mod => mod.Marker),
  { ssr: false }
)
const Popup = dynamic(
  () => import('react-leaflet').then(mod => mod.Popup),
  { ssr: false }
)

type Coordinates = {
  latitude: number;
  longitude: number;
} | null;

type Profile = {
  username: string
  display_name: string | null
  email: string
  location_name: string | null
  location_coordinates: string | null
  location_lat: number | null
  location_lng: number | null
  created_at: string
}

export function UserInfoCard({ profile }: { profile: Profile }) {
  const [locationName, setLocationName] = useState(profile.location_name || '')
  const [username, setUsername] = useState(profile.username || '')
  const [displayName, setDisplayName] = useState(profile.display_name || '')
  const [coordinates, setCoordinates] = useState<Coordinates>(() => {
    if (profile.location_lat !== null && profile.location_lng !== null) {
      return {
        latitude: profile.location_lat,
        longitude: profile.location_lng
      };
    }
    return null;
  })
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [mapKey, setMapKey] = useState(0)
  const [markerIcon, setMarkerIcon] = useState<L.Icon | null>(null)
  const supabase = createClient()

  // Initialize Leaflet icon on client side
  useEffect(() => {
    setMarkerIcon(L.icon({
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    }))
  }, [])

  // Update map when coordinates change
  useEffect(() => {
    setMapKey(prev => prev + 1)
  }, [coordinates])

  const updateLocation = async () => {
    setIsUpdatingLocation(true)
    try {
      if (!navigator.geolocation) {
        toast.error('Geolocation is not supported by your browser')
        return
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject)
      })

      // Store coordinates
      setCoordinates({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      })

      // Use a geocoding service to get the location name
      const response = await fetch(
        `https://api.opencagedata.com/geocode/v1/json?q=${position.coords.latitude}+${position.coords.longitude}&key=${process.env.NEXT_PUBLIC_OPENCAGE_API_KEY}`
      )
      const data = await response.json()

      if (data.results && data.results.length > 0) {
        const result = data.results[0]
        const locationName = result.formatted
        setLocationName(locationName)
      } else {
        toast.error('Could not determine location name')
      }
    } catch (error) {
      console.error('Error getting location:', error)
      toast.error('Error getting location. Please try again.')
    } finally {
      setIsUpdatingLocation(false)
    }
  }

  const saveProfile = async () => {
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username,
          display_name: displayName,
          location_name: locationName,
          location_coordinates: coordinates 
            ? `POINT(${coordinates.longitude} ${coordinates.latitude})`
            : null
        })
        .eq('id', (await supabase.auth.getUser()).data.user?.id)

      if (error) throw error

      toast.success('Profile updated successfully')
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error('Error updating profile. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Username</Label>
          <Input 
            value={username} 
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter username"
          />
        </div>
        <div className="space-y-2">
          <Label>Display Name</Label>
          <Input 
            value={displayName} 
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Enter display name"
          />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input value={profile.email || ""} readOnly />
        </div>
        <div className="space-y-2">
          <Label>Location</Label>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <Input 
              value={locationName} 
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="Enter location"
            />
            <Button 
              variant="outline" 
              size="icon"
              onClick={updateLocation}
              disabled={isUpdatingLocation}
            >
              {isUpdatingLocation ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MapPin className="h-4 w-4" />
              )}
            </Button>
          </div>
          {coordinates && markerIcon && (
            <>
              <div className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                Coordinates: {coordinates.latitude.toFixed(6)}, {coordinates.longitude.toFixed(6)}
              </div>
              <div className="h-[300px] w-full rounded-md overflow-hidden mt-2" key={mapKey}>
                <MapContainer
                  center={[coordinates.latitude, coordinates.longitude]}
                  zoom={13}
                  scrollWheelZoom={false}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={[coordinates.latitude, coordinates.longitude]} icon={markerIcon}>
                    <Popup>
                      {locationName || 'Your Location'}
                    </Popup>
                  </Marker>
                </MapContainer>
              </div>
            </>
          )}
          {!coordinates && profile.location_coordinates && (
            <div className="text-sm text-destructive mt-1">
              Error loading coordinates. Raw value: {profile.location_coordinates}
              <br />
              Please try updating your location.
            </div>
          )}
        </div>
        <div className="space-y-2">
          <Label>Member Since</Label>
          <div>
            {new Intl.DateTimeFormat('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }).format(new Date(profile.created_at))}
          </div>
        </div>
        <Button 
          className="w-full" 
          onClick={saveProfile}
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </CardContent>
    </Card>
  )
} 