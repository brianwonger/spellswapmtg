import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Star, Shield } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { UserInfoCard } from "@/components/user-info-card"

type UserRating = {
  total_reviews: number
  average_rating: number
  recommend_count: number
}

type Profile = {
  username: string
  display_name: string | null
  email: string
  location_name: string | null
  location_coordinates: string | null
  location_lat: number | null
  location_lng: number | null
  created_at: string
  user_ratings: UserRating | null
}

type DatabaseProfile = {
  id: string
  username: string
  display_name: string | null
  email: string
  location_name: string | null
  location_coordinates: string | null
  location_lat: number | null
  location_lng: number | null
  created_at: string
  user_ratings: UserRating[] | null
}

export default async function ProfilePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Fetch profile data
  let profileData: DatabaseProfile | null = null;
  
  const { data: existingProfile, error } = await supabase
    .from("profiles")
    .select(`
      id,
      username,
      display_name,
      email,
      location_name,
      location_coordinates,
      created_at,
      user_ratings (
        total_reviews,
        average_rating,
        recommend_count
      )
    `)
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("Error fetching profile:", error);
    return (
      <div className="container py-8">
        <div className="bg-destructive/15 text-destructive p-4 rounded-md">
          <h2 className="font-semibold">Error loading profile</h2>
          <p className="text-sm mt-1">Please try refreshing the page. If the problem persists, contact support.</p>
        </div>
      </div>
    );
  }

  // If coordinates exist, fetch them separately using raw SQL
  let coordinates = null;
  if (existingProfile?.location_coordinates) {
    console.log('Attempting to get coordinates for:', existingProfile.location_coordinates);
    const { data: coordData, error: coordError } = await supabase
      .rpc('get_coordinates', { 
        point: existingProfile.location_coordinates.toString()
      });
    
    if (coordError) {
      console.error('Error getting coordinates:', coordError);
    } else {
      console.log('Coordinate data:', coordData);
      if (coordData && coordData.length > 0) {
        coordinates = {
          lat: coordData[0].lat,
          lng: coordData[0].lng
        };
        console.log('Parsed coordinates:', coordinates);
      }
    }
  }

  if (!existingProfile) {
    // Create a default profile if none exists
    const defaultProfile: Omit<DatabaseProfile, 'user_ratings'> = {
      id: user.id,
      username: user.email?.split("@")[0] || "user",
      display_name: null,
      email: user.email || "",
      location_name: null,
      location_coordinates: null,
      location_lat: null,
      location_lng: null,
      created_at: new Date().toISOString(),
    };

    const { data: newProfile, error: createError } = await supabase
      .from("profiles")
      .insert([defaultProfile])
      .select()
      .single();

    if (createError) {
      console.error("Error creating profile:", createError);
      return (
        <div className="container py-8">
          <div className="bg-destructive/15 text-destructive p-4 rounded-md">
            <h2 className="font-semibold">Error creating profile</h2>
            <p className="text-sm mt-1">Please try refreshing the page. If the problem persists, contact support.</p>
          </div>
        </div>
      );
    }

    if (!newProfile) {
      throw new Error("Failed to create profile");
    }

    profileData = {
      ...newProfile,
      location_lat: null,
      location_lng: null
    };
  } else {
    profileData = {
      ...existingProfile,
      location_lat: coordinates?.lat ?? null,
      location_lng: coordinates?.lng ?? null
    };
  }

  // Transform the data to match our type
  if (!profileData) {
    throw new Error("Failed to load profile data");
  }

  const typedProfile: Profile = {
    username: profileData.username,
    display_name: profileData.display_name,
    email: profileData.email,
    location_name: profileData.location_name,
    location_coordinates: profileData.location_coordinates,
    location_lat: profileData.location_lat,
    location_lng: profileData.location_lng,
    created_at: profileData.created_at,
    user_ratings: profileData.user_ratings?.[0] || null
  };

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Profile</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <UserInfoCard profile={typedProfile} />

        {/* Trading Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Trading Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" />
              <span className="font-medium">{typedProfile.user_ratings?.average_rating.toFixed(1) || "No ratings"}</span>
              <span className="text-muted-foreground">
                ({typedProfile.user_ratings?.total_reviews || 0} reviews)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-500" />
              <span>{typedProfile.user_ratings?.recommend_count || 0} successful trades</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 