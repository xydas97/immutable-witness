'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ConnectButton } from '@/components/wallet/ConnectButton'

const NAV_LINKS = [
  { href: '/', label: 'Live Map', icon: '🗺️' },
  { href: '/history', label: 'Historic Events', icon: '🕐' },
  { href: '/my-proofs', label: 'My Proofs', icon: '🟠' },
]

export function NavBar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 text-lg font-bold text-white">
          <span className="text-teal">◆</span>
          Immutable Witness
        </Link>

        {/* Desktop nav links */}
        <div className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-b-2 border-teal text-teal'
                    : 'text-text-muted hover:text-white'
                }`}
              >
                <span className="mr-1.5">{link.icon}</span>
                {link.label}
              </Link>
            )
          })}
        </div>

        {/* Wallet + mobile toggle */}
        <div className="flex items-center gap-3">
          <div className="hidden md:block">
            <ConnectButton />
          </div>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="rounded-lg p-2 text-text-muted hover:text-white md:hidden"
            aria-label="Toggle menu"
          >
            {mobileOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="border-t border-white/10 bg-background px-4 pb-4 pt-2 md:hidden">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`block rounded-lg px-3 py-2 text-sm font-medium ${
                  isActive ? 'text-teal' : 'text-text-muted'
                }`}
              >
                <span className="mr-1.5">{link.icon}</span>
                {link.label}
              </Link>
            )
          })}
          <div className="mt-3 border-t border-white/10 pt-3">
            <ConnectButton />
          </div>
        </div>
      )}
    </nav>
  )
}
