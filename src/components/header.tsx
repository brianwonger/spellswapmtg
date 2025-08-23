'use client'

import Link from "next/link"
import { MainNav } from "@/components/navigation-menu"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Mail, ShoppingCart } from "lucide-react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"
import { toast } from "sonner"

// Debug utility to test avatar URL
const testAvatarUrl = (url: string) => {
  if (!url) return Promise.resolve({ status: 'empty' })

  return fetch(url, { method: 'HEAD' })
    .then(response => ({ status: response.ok ? 'success' : 'error', statusCode: response.status }))
    .catch(error => ({ status: 'network-error', error: error.message }))
}

// Debug utility to test avatars bucket
const testAvatarsBucket = async (supabase: any) => {
  try {
    const { data, error } = await supabase.storage.listBuckets()
    if (error) {
      console.log('Header: Error listing buckets:', error)
      return { status: 'error', error: error.message }
    }

    const avatarsBucket = data.find((bucket: any) => bucket.name === 'avatars')
    if (!avatarsBucket) {
      console.log('Header: Avatars bucket not found')
      return { status: 'bucket-not-found', buckets: data.map((b: any) => b.name) }
    }

    console.log('Header: Avatars bucket found:', avatarsBucket)
    return { status: 'bucket-found', bucket: avatarsBucket }
  } catch (error) {
    console.log('Header: Error testing avatars bucket:', error)
    return { status: 'error', error: error.message }
  }
}

// Utility to fix avatar URL issues
const fixAvatarUrl = async (supabase: any, userId: string, currentAvatarUrl: string | null) => {
  if (!currentAvatarUrl) {
    console.log('Header: No avatar URL to fix')
    return null
  }

  try {
    // Extract the file path from the URL
    const url = new URL(currentAvatarUrl)
    const pathParts = url.pathname.split('/')
    const fileName = pathParts[pathParts.length - 1]

    if (!fileName) {
      console.log('Header: Could not extract filename from avatar URL')
      return null
    }

    // Try to get the public URL for the file
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(`${userId}/${fileName}`)

    console.log('Header: Fixed avatar URL:', publicUrl)
    return publicUrl
  } catch (error) {
    console.log('Header: Error fixing avatar URL:', error)
    return null
  }
}

type Profile = {
  username: string
  email: string
  avatar_url: string | null
}

export function Header() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [cartCount, setCartCount] = useState(0)
  const router = useRouter()

  // Fetch cart count
  useEffect(() => {
    async function fetchCartCount() {
      try {
        const response = await fetch('/api/cart/count')
        if (!response.ok) throw new Error('Failed to fetch cart count')
        const data = await response.json()
        setCartCount(data.count)
      } catch (error) {
        console.error('Error fetching cart count:', error)
      }
    }

    fetchCartCount()
    // Refresh cart count every 30 seconds
    const interval = setInterval(fetchCartCount, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    async function getProfile() {
      const supabase = createClient()

      // Test avatars bucket first (for debugging)
      const bucketTest = await testAvatarsBucket(supabase)

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('username, email, avatar_url')
          .eq('id', user.id)
          .single()



        if (data) {
          // Test and potentially fix the avatar URL
          if (data.avatar_url) {
            const testResult = await testAvatarUrl(data.avatar_url)

            if (testResult.status !== 'success') {
              const fixedUrl = await fixAvatarUrl(supabase, user.id, data.avatar_url)

              if (fixedUrl && fixedUrl !== data.avatar_url) {
                const { error: updateError } = await supabase
                  .from('profiles')
                  .update({ avatar_url: fixedUrl })
                  .eq('id', user.id)

                if (!updateError) {
                  data.avatar_url = fixedUrl
                }
              }
            }
          }

          setProfile(data)
        }
      }
    }

    getProfile()
  }, [])

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <span className="hidden sm:inline-block text-xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hover:scale-110 transition-transform duration-500">Spell Swap</span>
        </Link>
        <MainNav />
        <div className="flex items-center ml-auto space-x-4">
          <Link href="/cart" className="text-muted-foreground hover:text-foreground transition-colors relative">
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Link>
          <Link href="/messages" className="text-muted-foreground hover:text-foreground transition-colors">
            <Mail className="h-5 w-5" />
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={profile?.avatar_url || ""}
                    alt={profile?.username || 'User'}
                  />
                  <AvatarFallback>
                    {profile?.username?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{profile?.username || 'Loading...'}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {profile?.email || 'Loading...'}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile">Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuItem disabled className="cursor-not-allowed opacity-50">
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/auth/signout">Sign out</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
} 