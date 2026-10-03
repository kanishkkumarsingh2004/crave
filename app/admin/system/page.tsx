'use client'

export default function AdminSystemPage() {
  return (
    <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm">
      <h3 className="text-xl font-bold">System Health & Live Monitoring</h3>
      <p className="text-xs text-[#737e77] mt-0.5">
        Real-time API gateway status, JWT token verifications, and audit logs.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4">
          <p className="text-xs font-bold text-emerald-900">API Gateway Status</p>
          <p className="text-lg font-bold text-emerald-700 mt-1">Operational (99.98%)</p>
        </div>
        <div className="rounded-2xl bg-blue-50 border border-blue-200 p-4">
          <p className="text-xs font-bold text-blue-900">JWT Authentication</p>
          <p className="text-lg font-bold text-blue-700 mt-1">Active & Secured (HS256)</p>
        </div>
        <div className="rounded-2xl bg-purple-50 border border-purple-200 p-4">
          <p className="text-xs font-bold text-purple-900">Database Connection</p>
          <p className="text-lg font-bold text-purple-700 mt-1">Healthy (12ms latency)</p>
        </div>
      </div>
    </div>
  )
}
