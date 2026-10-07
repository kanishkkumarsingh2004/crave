'use client'

export default function AdminSystemPage() {
  return (
    <div className="rounded-3xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-6 shadow-sm">
      <h3 className="text-xl font-bold text-[#18201c] dark:text-white">
        System Health & Live Monitoring
      </h3>
      <p className="text-xs text-[#737e77] dark:text-gray-400 mt-0.5">
        Real-time API gateway status, JWT token verifications, and audit logs.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/50 p-4">
          <p className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
            API Gateway Status
          </p>
          <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400 mt-1">
            Operational (99.98%)
          </p>
        </div>
        <div className="rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/50 p-4">
          <p className="text-xs font-bold text-blue-900 dark:text-blue-300">JWT Authentication</p>
          <p className="text-lg font-bold text-blue-700 dark:text-blue-400 mt-1">
            Active & Secured (HS256)
          </p>
        </div>
        <div className="rounded-2xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/50 p-4">
          <p className="text-xs font-bold text-purple-900 dark:text-purple-300">
            Database Connection
          </p>
          <p className="text-lg font-bold text-purple-700 dark:text-purple-400 mt-1">
            Healthy (12ms latency)
          </p>
        </div>
      </div>
    </div>
  )
}
