import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default async function DashboardPage() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
        <p className="mb-6">
          Welcome! You are logged in as{' '}
          <span className="font-semibold">{user.email}</span>.
        </p>
        <form action="/auth/signout" method="post">
          <Button type="submit">
            Sign Out
          </Button>
        </form>
      </div>
    </div>
  )
} 