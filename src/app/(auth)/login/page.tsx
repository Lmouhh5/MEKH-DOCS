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
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#121316]">
      {/* ===================== LEFT SIDE (DARK HERO) ===================== */}
      <div className="lg:w-1/2 flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-16 bg-[#121316] text-white">
        {/* Brand Header */}
        <div className="flex items-center gap-3.5">
          {/* Stylized Industrial Logo Icon */}
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-7 bg-[#E86326] rounded-xs" />
            <div className="flex flex-col gap-1">
              <div className="w-3.5 h-3 bg-[#E86326] rounded-xs" />
              <div className="w-3.5 h-3 bg-zinc-600 rounded-xs" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-extrabold text-2xl tracking-wider text-white">ERP</span>
            <div className="h-5 w-px bg-zinc-700/80" />
            <span className="text-[10px] font-mono font-semibold tracking-widest text-zinc-400 uppercase leading-tight">
              TRAVAUX PUBLICS<br />&amp; CARRIÈRES
            </span>
          </div>
        </div>

        {/* Hero Copy & Quarry Image */}
        <div className="my-8 lg:my-auto max-w-xl">
          {/* Overline */}
          <div className="flex items-center gap-2 mb-3">
            <span className="w-4 h-0.5 bg-[#E86326] inline-block" />
            <span className="text-[11px] font-mono tracking-widest text-zinc-400 uppercase">
              SOLIDE SUR LE TERRAIN. SIMPLE AU QUOTIDIEN.
            </span>
          </div>

          {/* Heading */}
          <h1 className="text-3xl sm:text-4xl xl:text-5xl font-bold tracking-tight text-white leading-tight">
            Le terrain avance.<br />
            Votre gestion aussi.
          </h1>

          {/* Subtitle */}
          <p className="text-zinc-400 text-sm xl:text-base leading-relaxed mt-4 max-w-lg">
            Vos documents, vos opérations et votre régime réel réunis dans un même espace. Pour garder le cap, chaque jour.
          </p>

          {/* Quarry Image Frame */}
          <div className="mt-8 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 shadow-2xl">
            <div className="relative">
              <Image
                src="/images/quarry.jpg"
                alt="Carrière et engins de travaux publics"
                width={800}
                height={400}
                priority
                className="w-full h-52 sm:h-64 xl:h-72 object-cover brightness-95"
              />
              {/* Badge overlay on image */}
              <div className="absolute top-3.5 left-3.5 flex items-center gap-2 px-3 py-1 rounded bg-black/75 backdrop-blur-md border border-white/10 text-[10px] font-mono font-semibold tracking-wider text-white uppercase">
                <span className="size-2 bg-[#E86326] rounded-xs" />
                <span>AU PLUS PRÈS DE VOTRE MÉTIER</span>
              </div>
              {/* Technical crosshair in corner */}
              <div className="absolute bottom-3 right-3 text-white/50 text-xs font-mono select-none" aria-hidden="true">
                +
              </div>
            </div>
            {/* Caption underneath image */}
            <div className="flex items-center justify-between py-2.5 px-4 bg-zinc-900/90 border-t border-zinc-800 text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
              <span>DU CHANTIER AU BUREAU, UNE MÊME VISION.</span>
              <span>TP / CARRIÈRES</span>
            </div>
          </div>
        </div>

        {/* Bottom 3-Column Pillars */}
        <div className="pt-6 border-t border-zinc-800/80 grid grid-cols-3 gap-4">
          <div>
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">
              01 / ORGANISER
            </span>
            <span className="text-xs sm:text-sm font-semibold text-white mt-1 block">
              Gestion documentaire
            </span>
          </div>
          <div>
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">
              02 / MAÎTRISER
            </span>
            <span className="text-xs sm:text-sm font-semibold text-white mt-1 block">
              Régime réel
            </span>
          </div>
          <div>
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">
              03 / AVANCER
            </span>
            <span className="text-xs sm:text-sm font-semibold text-white mt-1 block">
              Pilotage d&apos;activité
            </span>
          </div>
        </div>
      </div>

      {/* ===================== RIGHT SIDE (LIGHT FORM) ===================== */}
      <div className="lg:w-1/2 flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-16 bg-[#FAF9F5] text-zinc-900 min-h-screen lg:min-h-0">
        {/* Top Utility Bar */}
        <div className="flex items-center justify-between w-full text-zinc-500 text-[11px] font-mono">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="size-4 text-zinc-400" />
            <span className="tracking-widest uppercase font-medium">ACCÈS SÉCURISÉ</span>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-600 text-xs font-sans font-medium cursor-pointer hover:text-zinc-900 transition-colors">
            <Globe className="size-3.5 text-zinc-400" />
            <span>Français</span>
            <ChevronDown className="size-3 text-zinc-400" />
          </div>
        </div>

        {/* Center Login Form Container */}
        <div className="w-full max-w-md mx-auto my-auto py-8">
          {/* Overline */}
          <div className="flex items-center gap-2 mb-2">
            <span className="size-2 bg-[#E86326] rounded-xs" />
            <span className="text-[11px] font-mono font-bold tracking-widest text-[#E86326] uppercase">
              VOTRE ESPACE DE TRAVAIL
            </span>
          </div>

          {/* Heading */}
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 leading-tight">
            Heureux de vous<br />retrouver.
          </h2>

          {/* Subtitle */}
          <p className="text-zinc-500 text-sm mt-3 leading-relaxed">
            Connectez-vous pour retrouver vos documents et reprendre le fil de votre activité.
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {error && (
              <div
                className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 font-medium"
                role="alert"
              >
                {error}
              </div>
            )}

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-zinc-700">
                Adresse e-mail
              </label>
              <div className="relative mt-1.5">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
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
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-zinc-200 bg-white text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#E86326] focus:border-[#E86326] transition-shadow shadow-xs"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-zinc-700">
                Mot de passe
              </label>
              <div className="relative mt-1.5">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
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
                  className="w-full pl-9 pr-10 py-2.5 rounded-lg border border-zinc-200 bg-white text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#E86326] focus:border-[#E86326] transition-shadow shadow-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-600 transition-colors"
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-zinc-600">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="size-4 rounded border-zinc-300 text-[#E86326] focus:ring-[#E86326] accent-[#E86326]"
                />
                <span>Se souvenir de moi</span>
              </label>
              <button
                type="button"
                className="text-zinc-600 hover:text-zinc-900 transition-colors"
                onClick={() => {}}
              >
                Mot de passe oublié ?
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 py-3 px-5 bg-[#E86326] hover:bg-[#D45318] active:bg-[#B84510] text-white rounded-lg text-sm font-semibold transition-all flex items-center justify-between shadow-sm disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
            >
              <span className="w-4" aria-hidden="true" />
              <span>{loading ? 'Connexion en cours...' : 'Se connecter'}</span>
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </form>

          {/* Assistance Support Block */}
          <div className="mt-8 flex items-center gap-3.5 pt-4">
            <div className="p-2.5 rounded-full bg-orange-50 text-[#E86326] shrink-0 border border-orange-100">
              <Headphones className="size-4" />
            </div>
            <div>
              <span className="text-xs text-zinc-500 block leading-tight">
                Un problème pour vous connecter ?
              </span>
              <a
                href="mailto:support@erp.local"
                className="text-xs font-semibold text-zinc-800 hover:text-[#E86326] transition-colors inline-flex items-center gap-1 mt-0.5"
              >
                Contacter l&apos;assistance <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-6 text-center text-xs text-zinc-400">
          <p>© 2026 ERP · Travaux publics &amp; carrières</p>
          <div className="flex items-center justify-center gap-2 mt-1 text-zinc-400">
            <span className="hover:text-zinc-600 cursor-pointer">Confidentialité</span>
            <span>/</span>
            <span className="hover:text-zinc-600 cursor-pointer">Mentions légales</span>
          </div>
        </div>
      </div>
    </div>
  )
}
