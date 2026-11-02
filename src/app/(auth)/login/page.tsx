'use client'

import React, { FormEvent, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import {
  ShieldCheck,
  Globe,
  ChevronDown,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Headphones,
} from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
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
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-paper text-ink">
      <div className="lg:w-1/2 flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-16 ribbon-night ribbon-grain text-ink">
        <div className="flex items-center gap-3.5">
          <div
            className="ribbon-part size-10 flex items-center justify-center shrink-0"
            aria-hidden="true"
          >
            <span className="h-5 w-1 rounded-pill bg-primary" />
          </div>
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-display text-2xl font-medium tracking-tight text-ink">
              ERP
            </span>
            <div className="h-5 w-px bg-rule shrink-0" aria-hidden="true" />
            <span className="text-[12px] text-muted-foreground leading-snug">
              Travaux publics
              <br />
              &amp; carrières
            </span>
          </div>
        </div>

        <div className="my-8 lg:my-auto max-w-xl">
          <p className="text-[13px] text-muted-foreground mb-3">
            Solide sur le terrain. Simple au quotidien.
          </p>

          <h1 className="font-display text-3xl sm:text-4xl xl:text-5xl font-normal tracking-tight text-ink leading-[1.05] max-w-none">
            Le terrain avance.
            <br />
            Votre gestion aussi.
          </h1>

          <p className="text-muted-foreground text-sm xl:text-base leading-relaxed mt-4 max-w-lg">
            Vos documents, vos opérations et votre régime réel réunis dans un même espace. Pour garder le cap, chaque jour.
          </p>

          <figure className="mt-8 ribbon-panel overflow-hidden">
            <div className="relative">
              <Image
                src="/images/quarry.jpg"
                alt="Carrière et engins de travaux publics"
                width={800}
                height={400}
                priority
                className="w-full h-52 sm:h-64 xl:h-72 object-cover opacity-90"
              />
            </div>
            <figcaption className="flex items-center justify-between py-2.5 px-4 border-t border-rule text-[12px] text-muted-foreground">
              <span>Du chantier au bureau, une même vision.</span>
              <span className="font-mono tabular-nums">TP</span>
            </figcaption>
          </figure>
        </div>

        <div className="pt-6 border-t border-rule grid grid-cols-3 gap-4">
          <div>
            <span className="text-[12px] text-muted-foreground block">Organiser</span>
            <span className="text-sm font-medium text-ink mt-1 block">
              Gestion documentaire
            </span>
          </div>
          <div>
            <span className="text-[12px] text-muted-foreground block">Maîtriser</span>
            <span className="text-sm font-medium text-ink mt-1 block">Régime réel</span>
          </div>
          <div>
            <span className="text-[12px] text-muted-foreground block">Avancer</span>
            <span className="text-sm font-medium text-ink mt-1 block">
              Pilotage d&apos;activité
            </span>
          </div>
        </div>
      </div>

      <div className="lg:w-1/2 flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-16 bg-paper-2 text-ink min-h-screen lg:min-h-0 border-l border-rule">
        <div className="flex items-center justify-between w-full text-muted-foreground text-[12px]">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="size-4 text-muted-foreground" />
            <span className="font-medium">Accès sécurisé</span>
          </div>
          <div className="flex items-center gap-1.5 text-ink-2 text-xs font-medium">
            <Globe className="size-3.5 text-muted-foreground" />
            <span>Français</span>
            <ChevronDown className="size-3 text-muted-foreground" aria-hidden="true" />
          </div>
        </div>

        <div className="w-full max-w-md mx-auto my-auto py-8 animate-ribbon-fade motion-reduce:animate-none">
          <p className="text-[13px] text-primary mb-2">Votre espace de travail</p>

          <h2 className="font-display text-3xl sm:text-4xl font-normal tracking-tight text-ink leading-[1.05] max-w-none">
            Heureux de vous
            <br />
            retrouver.
          </h2>

          <p className="text-muted-foreground text-sm mt-3 leading-relaxed">
            Connectez-vous pour retrouver vos documents et reprendre le fil de votre activité.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {error && (
              <div
                className="rounded-part border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive font-medium"
                role="alert"
              >
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-[13px] font-medium text-ink-2">
                Adresse e-mail
              </label>
              <div className="relative mt-1.5">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                  <Mail className="size-4" />
                </div>
                <input
                  id="email"
                  type="email"
                  name="email"
                  placeholder="vous@entreprise.fr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  disabled={loading}
                  className="w-full h-11 pl-9 pr-3.5 rounded-pill border border-rule bg-paper text-sm text-ink placeholder:text-muted-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring transition-colors duration-micro shadow-part disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-[13px] font-medium text-ink-2">
                Mot de passe
              </label>
              <div className="relative mt-1.5">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                  <Lock className="size-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="Saisissez votre mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  disabled={loading}
                  className="w-full h-11 pl-9 pr-10 rounded-pill border border-rule bg-paper text-sm text-ink placeholder:text-muted-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring transition-colors duration-micro shadow-part disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-ink transition-colors duration-micro focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded-part"
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-[13px] pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-muted-foreground">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="size-4 rounded-part border-rule accent-[var(--color-accent)]"
                />
                <span>Se souvenir de moi</span>
              </label>
              <button
                type="button"
                className="text-muted-foreground hover:text-ink transition-colors duration-micro focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded-part"
                onClick={() => {}}
              >
                Mot de passe oublié ?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 h-[52px] px-5 bg-primary hover:brightness-110 text-primary-foreground rounded-pill text-sm font-medium transition-transform duration-micro flex items-center justify-between shadow-part disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer border border-primary active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <span className="w-4" aria-hidden="true" />
              <span>{loading ? 'Connexion en cours…' : 'Se connecter'}</span>
              <ArrowRight className="size-4 transition-transform duration-micro group-hover:translate-x-0.5" />
            </button>
          </form>

          <div className="mt-8 flex items-center gap-3.5 pt-4 border-t border-rule">
            <div className="ribbon-part p-2.5 text-primary shrink-0">
              <Headphones className="size-4" />
            </div>
            <div>
              <span className="text-[13px] text-muted-foreground block leading-tight">
                Un problème pour vous connecter ?
              </span>
              <a
                href="mailto:support@erp.local"
                className="text-[13px] font-medium text-ink hover:text-primary transition-colors duration-micro inline-flex items-center gap-1 mt-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded-part"
              >
                Contacter l&apos;assistance
              </a>
            </div>
          </div>
        </div>

        <div className="pt-6 text-center text-[13px] text-muted-foreground">
          <p>© 2026 ERP · Travaux publics &amp; carrières</p>
          <div className="flex items-center justify-center gap-2 mt-1">
            <span className="hover:text-ink cursor-pointer transition-colors duration-micro">
              Confidentialité
            </span>
            <span aria-hidden="true">/</span>
            <span className="hover:text-ink cursor-pointer transition-colors duration-micro">
              Mentions légales
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
