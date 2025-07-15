'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [isSignedUp, setIsSignedUp] = useState(false)
  const [signupError, setSignupError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleSignUp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (password.length > 0 && password.length < 6) {
      setPasswordError('Password must be at least 6 characters long.')
      setSignupError(null)
      return
    }
    setPasswordError(null)
    setSignupError(null)
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${location.origin}/auth/email-confirmed`,
        },
      })

      // Add detailed logging for debugging
      console.log('Supabase signUp response:', {
        data,
        error: error ? {
          name: error.name,
          message: error.message,
          status: error.status,
          stack: error.stack
        } : null
      })

      if (error) {
        if (error.message && error.message.toLowerCase().includes('user already registered')) {
          setSignupError('This email is already registered. Please log in or use a different email.')
        } else {
          setSignupError(`Error: ${error.message} (${error.status})`)
        }
        return
      }

      if (data.user) {
        setIsSignedUp(true)
        setSignupError(null)
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Unexpected error during signup'
      console.error('Signup error details:', {
        message: errorMessage,
        error: error,
        stack: error.stack
      })
      setSignupError(`Error: ${errorMessage}`)
    }
  }
  
  if (isSignedUp) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="mx-auto max-w-sm">
          <CardHeader>
            <CardTitle className="text-2xl">Check your email</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              We've sent a confirmation link to {email}. Please check your inbox
              to complete the sign up process.
            </p>
            <div className="mt-6">
              <Link href="/login" passHref>
                <Button className="w-full">login page</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="mx-auto max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Sign Up</CardTitle>
          <CardDescription>
            Enter your information to create an account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {signupError && (
            <div className="mb-2 text-red-500 text-sm text-center">{signupError}</div>
          )}
          <form onSubmit={handleSignUp} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setSignupError(null)
                }}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setSignupError(null)
                }}
              />
              {passwordError && <p className="text-red-500 text-xs mt-1">{passwordError}</p>}
            </div>
            <Button type="submit" className="w-full">
              Create an account
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            Already have an account?{' '}
            <Link href="/login" className="underline">
              Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 