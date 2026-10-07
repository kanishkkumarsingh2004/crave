'use client'

import { useAuth } from '@/lib/auth-context'
import { Award, Clock3, Flame, ShieldAlert, Sparkles, Target, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'

interface IncentiveItem {
  id: string
  title: string
  description: string
  rewardAmount: number
  startsAt?: string
  endsAt?: string
  isActive: boolean
}

export default function DriverIncentivesPage() {
  const { user } = useAuth()
  const [incentives, setIncentives] = useState<IncentiveItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadIncentives() {
      try {
        const res = await fetch(`/api/driver/incentives?driverId=${user?.id || ''}`)
        const json = await res.json()
        if (json.success && Array.isArray(json.incentives)) {
          setIncentives(json.incentives)
        }
      } catch (err) {
        console.error('Failed to load driver incentives:', err)
      } finally {
        setLoading(false)
      }
    }
    loadIncentives()
  }, [user?.id])

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="rounded-3xl border border-[#d9f447]/30 bg-[#121815] p-6 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#d9f447]/20 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#d9f447] border border-[#d9f447]/40">
              <Flame className="size-3.5 text-[#d9f447]" /> Peak Surge &amp; Daily Quests
            </div>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-white">
              Earn Bonus Payouts &amp; Milestone Rewards
            </h2>
            <p className="mt-1 text-xs text-white/70 max-w-lg">
              Active zone surge multipliers, rain bonuses, and daily delivery target quests in
              Indiranagar &amp; Koramangala.
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 p-4 border border-white/15 text-center shrink-0">
            <p className="text-[10px] font-bold uppercase text-white/60">Bonus Multiplier</p>
            <p className="text-2xl font-extrabold text-[#d9f447] mt-0.5">1.4x Peak</p>
          </div>
        </div>
      </div>

      {/* Incentives & Quests List */}
      <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-[#f0f3ec] pb-4 mb-6">
          <div>
            <h3 className="text-lg font-bold text-[#18201c] flex items-center gap-2">
              <Target className="size-5 text-emerald-600" /> Active Driver Quests &amp; Surge
              Programs
            </h3>
            <p className="text-xs text-gray-500">
              Live incentive campaigns verified for your account zone.
            </p>
          </div>
          <span className="text-xs font-extrabold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-xl border border-emerald-300">
            {incentives.length} Campaigns Active
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs font-bold text-gray-400">
            Loading active surge programs...
          </div>
        ) : incentives.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {incentives.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-gray-200 p-5 bg-white hover:border-emerald-400 transition shadow-xs flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-emerald-800 border border-emerald-200">
                      Verified Surge
                    </span>
                    <span className="text-xs font-mono font-bold text-gray-400 flex items-center gap-1">
                      <Clock3 className="size-3 text-amber-500" /> {item.startsAt || 'Active'} –{' '}
                      {item.endsAt || 'Today'}
                    </span>
                  </div>
                  <h4 className="font-bold text-base text-[#18201c] mt-2 flex items-center gap-1.5">
                    <Zap className="size-4 text-amber-500 fill-amber-500" /> {item.title}
                  </h4>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">{item.description}</p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <span className="text-[11px] font-semibold text-gray-500">
                    Reward Cash Credit
                  </span>
                  <span className="text-base font-extrabold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
                    +₹{item.rewardAmount} Extra
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-xs text-gray-500">
            No active surge programs in your zone currently. Turn duty status ON to stay eligible
            for broadcast quests.
          </div>
        )}
      </div>
    </div>
  )
}
