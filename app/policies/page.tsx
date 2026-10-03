import PolicyLayout from '@/components/PolicyLayout'
import { ArrowRight, Cookie, FileText, Lock, ShieldCheck, ShoppingBag } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Guidelines and Policies | crave.',
  description: 'Central legal documentation, privacy guidelines, and terms for crave. platform.',
}

const POLICY_CARDS = [
  {
    title: 'Terms of Service',
    desc: 'General user terms, delivery conditions, customer account guidelines, and dispute resolutions.',
    href: '/policies/terms-of-service',
    icon: FileText,
  },
  {
    title: 'Privacy Policy',
    desc: 'How we collect, encrypt, and handle personal data, location telemetry, and account security.',
    href: '/policies/privacy',
    icon: Lock,
  },
  {
    title: 'Cookie Policy & Settings',
    desc: 'Details on essential cookies, performance tracking, and how to configure browser storage.',
    href: '/policies/cookies',
    icon: Cookie,
  },
  {
    title: 'Security & Vulnerabilities',
    desc: 'Platform security architecture, SSL encryption standards, and vulnerability reporting.',
    href: '/policies/security',
    icon: ShieldCheck,
  },
  {
    title: 'FSSAI Guidelines & Compliance',
    desc: 'Food safety norms, merchant licensing requirements, and dark store hygiene standards.',
    href: '/policies/fssai',
    icon: ShoppingBag,
  },
]

export default function PoliciesIndexPage() {
  return (
    <PolicyLayout
      title="Guidelines and Policies"
      lastUpdated="February 19, 2026"
      activeDoc="general"
    >
      <div className="space-y-6">
        <p className="text-gray-700 text-sm leading-relaxed">
          Welcome to the <strong className="text-[#18201c]">crave.</strong> Trust &amp; Legal
          Center. Below you will find all legal agreements, privacy frameworks, and regulatory
          disclosures governing the crave. food delivery app, Crave XP Instamart network, merchant
          portal, and rider platforms.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 pt-2">
          {POLICY_CARDS.map((card) => {
            const Icon = card.icon
            return (
              <Link
                key={card.href}
                href={card.href}
                className="group bg-gray-50/80 p-5 rounded-2xl border border-gray-200 hover:border-[#849e16] hover:bg-white transition shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="size-9 rounded-xl bg-[#849e16]/15 text-[#5e720d] flex items-center justify-center mb-3 group-hover:bg-[#18201c] group-hover:text-white transition">
                    <Icon className="size-4" />
                  </div>
                  <h3 className="font-extrabold text-[#18201c] text-base mb-1.5 flex items-center justify-between">
                    <span>{card.title}</span>
                    <ArrowRight className="size-4 text-gray-400 group-hover:text-[#849e16] group-hover:translate-x-1 transition" />
                  </h3>
                  <p className="text-xs text-gray-600 leading-relaxed">{card.desc}</p>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </PolicyLayout>
  )
}
