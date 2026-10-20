'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (res?.error) {
        setError('Identifiants invalides. Veuillez vérifier votre adresse e-mail et votre mot de passe.')
        setLoading(false)
        return
      }

      router.push('/')
      router.refresh()
    } catch {
      setError('Une erreur inattendue est survenue lors de la connexion.')
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md shadow-lg border border-border overflow-hidden">
        {/* Industrial hazard stripe bar across top of login card */}
        <div
          className="h-2 w-full bg-[repeating-linear-gradient(45deg,#d97706,#d97706_10px,#18181b_10px,#18181b_20px)]"
          aria-hidden="true"
        />
        <CardHeader className="text-center pt-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-2 h-5 bg-primary rounded-xs" />
            <span className="font-mono text-xs font-bold tracking-widest text-primary uppercase">
              ERP · TRAVAUX PUBLICS &amp; CARRIÈRES
            </span>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
            Connexion
          </CardTitle>
          <CardDescription>
            Système de Gestion Documentaire &amp; Régime Réel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div
                className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
                role="alert"
              >
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Adresse e-mail</Label>
              <Input
                id="email"
                type="email"
                name="email"
                placeholder="admin@erp.local"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                name="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Connexion en cours...' : 'Se connecter'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
