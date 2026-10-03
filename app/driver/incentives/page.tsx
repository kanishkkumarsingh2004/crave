'use client'

export default function DriverIncentivesPage() {
  return (
    <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm flex flex-col gap-6">
      <div>
        <h3 className="text-xl font-bold text-[#18201c]">Daily Quests & Surge Incentives</h3>
        <p className="text-xs text-gray-500">
          Complete delivery milestones today to unlock instant cash bonuses.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
          <span className="text-[10px] font-bold uppercase text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
            Quest 1
          </span>
          <h4 className="font-bold text-sm text-[#18201c] mt-2">Complete 5 Drops before 3 PM</h4>
          <p className="text-xs text-gray-600 mt-1">Reward: Extra ₹150 flat surge bonus</p>
          <div className="mt-3 flex items-center justify-between text-xs font-bold text-emerald-800">
            <span>Progress: 3 / 5 drops</span>
            <span>60%</span>
          </div>
          <div className="mt-1.5 h-2 w-full bg-emerald-200 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-600 w-3/5 rounded-full" />
          </div>
        </div>

        <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-4">
          <span className="text-[10px] font-bold uppercase text-purple-800 bg-purple-100 px-2 py-0.5 rounded-md">
            Quest 2
          </span>
          <h4 className="font-bold text-sm text-[#18201c] mt-2">Peak Hour Streak (7 PM - 10 PM)</h4>
          <p className="text-xs text-gray-600 mt-1">Reward: ₹50 extra bonus per drop</p>
          <span className="mt-3 inline-block text-xs font-bold text-purple-700">
            Starts tonight at 7:00 PM
          </span>
        </div>
      </div>
    </div>
  )
}
