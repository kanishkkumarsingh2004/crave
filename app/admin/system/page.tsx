'use client'

import {
  Activity,
  CheckCircle2,
  Cpu,
  Database,
  Globe,
  HardDrive,
  Lock,
  RefreshCw,
  Server,
  ShieldCheck,
  Zap,
} from 'lucide-react'
import React, { useState } from 'react'

export default function AdminSystemPage() {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState('Just now')

  const handleRefresh = () => {
    setIsRefreshing(true)
    setTimeout(() => {
      setIsRefreshing(false)
      setLastRefreshed(new Date().toLocaleTimeString())
    }, 800)
  }

  const logs = [
    {
      id: 'log_101',
      event: 'COMMERCIAL_CONTRACT_MIGRATION',
      actor: 'System Admin (SV)',
      ip: '192.168.1.42',
      status: 'SUCCESS',
      time: '2 mins ago',
    },
    {
      id: 'log_102',
      event: 'SETTLEMENT_PAYOUT_DISBURSED',
      actor: 'Financial Engine v2.0',
      ip: 'Internal Worker',
      status: 'SUCCESS',
      time: '14 mins ago',
    },
    {
      id: 'log_103',
      event: 'UPI_VPA_CONFIG_UPDATE',
      actor: 'System Admin (SV)',
      ip: '192.168.1.42',
      status: 'SUCCESS',
      time: '45 mins ago',
    },
    {
      id: 'log_104',
      event: 'WEBSOCKET_BROADCAST_BEACON',
      actor: 'Live Telemetry Daemon',
      ip: '127.0.0.1',
      status: 'SUCCESS',
      time: '1 hour ago',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#dfe4dc] dark:border-[#27342d] pb-5">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-widest text-[#b5de28] dark:text-[#d9f447]">
            Infrastructure &amp; Telemetry
          </span>
          <h2 className="mt-1 text-2xl font-bold text-[#18201c] dark:text-white">
            System Health &amp; Live Monitoring
          </h2>
          <p className="text-xs text-[#737e77] dark:text-gray-400 mt-0.5">
            Real-time API gateway status, JWT token verifications, database connection pool, and security audit logs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] text-gray-500 font-mono">
            Synced: {lastRefreshed}
          </span>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 rounded-2xl bg-[#18201c] dark:bg-[#d9f447] px-4 py-2 text-xs font-bold text-white dark:text-[#121815] shadow-md hover:bg-[#323d36] dark:hover:bg-[#c6e336] transition active:scale-95 shrink-0"
          >
            <RefreshCw className={`size-3.5 text-[#d9f447] dark:text-[#121815] ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh Telemetry
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-xs">
        <div className="rounded-3xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              API Gateway
            </span>
            <Server className="size-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-emerald-700 dark:text-emerald-400">
            99.98%
          </p>
          <span className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium block flex items-center gap-1">
            <CheckCircle2 className="size-3" /> Operational &amp; Healthy
          </span>
        </div>

        <div className="rounded-3xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              JWT Security
            </span>
            <Lock className="size-4 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-blue-700 dark:text-blue-400">
            HS256 Active
          </p>
          <span className="mt-1 text-[11px] text-gray-500 dark:text-gray-400 block">
            0 authorization anomalies
          </span>
        </div>

        <div className="rounded-3xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              PostgreSQL Latency
            </span>
            <Database className="size-4 text-purple-600 dark:text-purple-400" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-purple-700 dark:text-purple-400">
            12 ms
          </p>
          <span className="mt-1 text-[11px] text-gray-500 dark:text-gray-400 block">
            Connection pool: 18/50 active
          </span>
        </div>

        <div className="rounded-3xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              WebSocket Channel
            </span>
            <Zap className="size-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-amber-600 dark:text-amber-400">
            Live Stream
          </p>
          <span className="mt-1 text-[11px] text-gray-500 dark:text-gray-400 block">
            Zero-delay stats broadcasting
          </span>
        </div>
      </div>

      {/* Audit Trail Section */}
      <div className="rounded-3xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-6 shadow-xs text-xs space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#27342d] pb-3">
          <h3 className="font-bold text-[#18201c] dark:text-white flex items-center gap-2 text-sm">
            <Activity className="size-4 text-[#b5de28] dark:text-[#d9f447]" /> System Security &amp; Operations Audit Trail
          </h3>
          <span className="text-[10px] font-mono text-gray-400">
            Real-time Immutable Log
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono">
            <thead>
              <tr className="border-b border-gray-200 dark:border-[#27342d] text-gray-400 uppercase text-[10px]">
                <th className="py-2.5 px-3">Log ID</th>
                <th className="py-2.5 px-3">Event Name</th>
                <th className="py-2.5 px-3">Actor / Origin</th>
                <th className="py-2.5 px-3">IP Address</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#27342d] text-gray-700 dark:text-gray-300">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-[#202923] transition">
                  <td className="py-3 px-3 font-bold text-purple-600 dark:text-purple-400">{log.id}</td>
                  <td className="py-3 px-3 font-bold text-[#18201c] dark:text-white">{log.event}</td>
                  <td className="py-3 px-3">{log.actor}</td>
                  <td className="py-3 px-3 text-gray-400">{log.ip}</td>
                  <td className="py-3 px-3">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                      <CheckCircle2 className="size-3" /> {log.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right text-gray-400">{log.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

