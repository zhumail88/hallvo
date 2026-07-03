'use client'

import { useActionState } from 'react'
import { login } from './actions'
import { Button } from '@/components/ui/button'
import { Building2, Lock, Mail, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, null)

  return (
    <div className="flex min-h-screen items-center justify-center bg-radial from-secondary to-background p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-border bg-card p-8 shadow-xl">
        
        {/* Branding & Logo Area */}
        <div className="flex flex-col items-center space-y-3 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <Building2 className="h-9 w-9 animate-pulse" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary">Hallvo</h1>
            <p className="text-sm font-medium text-muted-foreground mt-1">
              Internal Booking & Hall Management System
            </p>
          </div>
        </div>

        {/* Login Form */}
        <form action={formAction} className="space-y-5">
          {state?.error && (
            <div className="rounded-lg bg-destructive/15 p-4 text-sm font-semibold text-destructive border border-destructive/20 text-center animate-shake">
              {state.error}
            </div>
          )}

          {/* Email input field */}
          <div className="space-y-2">
            <label 
              htmlFor="email" 
              className="text-base font-semibold text-foreground flex items-center gap-2"
            >
              <Mail className="h-4 w-4 text-primary" />
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="Enter your work email"
              required
              className="flex h-12 w-full rounded-xl border border-input bg-background px-4 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {/* Password input field */}
          <div className="space-y-2">
            <label 
              htmlFor="password" 
              className="text-base font-semibold text-foreground flex items-center gap-2"
            >
              <Lock className="h-4 w-4 text-primary" />
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Enter your password"
              required
              className="flex h-12 w-full rounded-xl border border-input bg-background px-4 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {/* Action Button */}
          <Button
            type="submit"
            disabled={isPending}
            className="w-full h-12 text-base font-semibold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-200 shadow-md flex items-center justify-center gap-2 mt-2"
          >
            {isPending ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </Button>
        </form>

        {/* Footer/Help Tip */}
        <div className="border-t border-border pt-4 text-center">
          <p className="text-xs text-muted-foreground leading-normal">
            For account setup or password recovery, please contact the wedding hall owner or administrator.
          </p>
        </div>
      </div>
    </div>
  )
}
