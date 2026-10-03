'use client'

import { ShieldAlert } from 'lucide-react'

export default function DriverIncentivesPage() {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-xs flex flex-col items-center justify-center min-h-[300px]">
      <div className="grid size-14 place-items-center rounded-2xl bg-gray-100 text-gray-400 mb-3">
        <ShieldAlert className="size-7" />
      </div>
      <h3 className="text-xl font-bold text-[#18201c]">Quests &amp; Surge Incentives Disabled</h3>
      <p className="text-xs text-gray-500 max-w-sm mt-1 leading-relaxed">
        Daily quests and surge incentive features are currently disabled.
      </p>
    </div>
  )
}
