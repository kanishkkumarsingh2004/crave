'use client'

import { useToast } from '@/lib/toast-context'
import {
  ArrowRight,
  Bot,
  Brain,
  Check,
  Cpu,
  Flame,
  LineChart,
  MapPin,
  Sparkles,
  TrendingUp,
  Zap,
} from 'lucide-react'
import React, { useState } from 'react'

export default function AIAnalyticsPage() {
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)
  const { toast } = useToast()

  function handleNotifySubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setSubscribed(true)
    toast('You are on the VIP Early Access list for Crave AI Analytics!', 'success')
  }

  const aiFeatures = [
    {
      id: 'predictive-demand',
      title: 'Predictive Demand & Heatmaps',
      description:
        'Time-series neural transformers that forecast meal order spikes 48 hours in advance based on weather, local events, and historical demand.',
      icon: LineChart,
      status: 'In Neural Training (85%)',
      badgeColor:
        'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800/50',
      progress: 85,
    },
    {
      id: 'price-elasticity',
      title: 'Dynamic Price & Menu Optimization',
      description:
        'AI agents analyzing item profit margins and elasticity, suggesting optimal menu prices and high-yield dish bundles to kitchen vendors.',
      icon: TrendingUp,
      status: 'Model Fine-Tuning (70%)',
      badgeColor:
        'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/50',
      progress: 70,
    },
    {
      id: 'route-optimization',
      title: 'Autonomous Delivery Route Batching',
      description:
        'Graph neural networks (GNNs) grouping multi-drop delivery orders to slash rider trip times and reduce fuel footprint by up to 34%.',
      icon: MapPin,
      status: 'Simulation Mode (90%)',
      badgeColor:
        'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800/50',
      progress: 90,
    },
    {
      id: 'churn-recommendations',
      title: 'Personalized CraveXP Recommender',
      description:
        'Hyper-personalized grocery & dish recommendation engine predicting customer cravings and triggering smart discount triggers.',
      icon: Zap,
      status: 'Data Pipeline Ready (95%)',
      badgeColor:
        'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50',
      progress: 95,
    },
  ]

  return (
    <div className="space-y-8 pb-12">
      {/* Top Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#738814] dark:text-[#d9f447] bg-[#f0f6d6] dark:bg-[#121815] px-2.5 py-0.5 rounded-full border border-[#dce8b0] dark:border-[#27342d]">
              Admin Intelligence
            </span>
            <span className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-2.5 py-0.5 rounded-full border border-purple-200 dark:border-purple-800/50">
              <Sparkles className="size-3" /> Crave AI v2.0
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-black text-[#18201c] dark:text-white sm:text-3xl tracking-tight">
            AI Analytics &amp; Predictive Insights
          </h1>
          <p className="text-xs font-medium text-[#627068] dark:text-gray-400">
            Next-gen artificial intelligence suite for demand forecasting, route batching, and
            pricing intelligence.
          </p>
        </div>
      </div>

      {/* Main Glassmorphic Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-[#121815] text-white p-6 sm:p-10 shadow-2xl border border-white/10">
        {/* Decorative background glows */}
        <div className="absolute -top-24 -right-24 size-96 rounded-full bg-[#d9f447]/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 size-96 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-3 py-1 text-xs font-bold text-[#d9f447] backdrop-blur-md mb-4">
            <Bot className="size-4 animate-bounce" />
            <span>Feature Under Active Neural Training</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
            Something Extraordinary is <span className="text-[#d9f447]">Coming Soon</span>
          </h2>

          <p className="mt-3 text-sm text-gray-300 leading-relaxed">
            Our Deep Learning Intelligence Engine is being trained on platform delivery metrics,
            vendor order frequency, and live rider telematics. Get ready for real-time AI dashboards
            that make data-driven decisions on autopilot.
          </p>

          {/* Early access notification form */}
          <div className="mt-8">
            {subscribed ? (
              <div className="inline-flex items-center gap-2.5 rounded-2xl bg-[#d9f447]/20 border border-[#d9f447]/40 px-5 py-3 text-sm font-bold text-[#d9f447]">
                <Check className="size-5" />
                <span>You are registered for AI Beta Access! We will notify you on launch.</span>
              </div>
            ) : (
              <form
                onSubmit={handleNotifySubmit}
                className="flex flex-col sm:flex-row gap-3 max-w-md"
              >
                <input
                  type="email"
                  required
                  placeholder="Enter admin email for early access"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-xs font-semibold text-white placeholder-gray-400 backdrop-blur-md focus:border-[#d9f447] focus:outline-hidden"
                />
                <button
                  type="submit"
                  className="rounded-2xl bg-[#d9f447] px-6 py-3 text-xs font-extrabold text-[#121815] shadow-lg hover:scale-105 transition flex items-center justify-center gap-2 shrink-0"
                >
                  Request Beta Access <ArrowRight className="size-4" />
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Model Readiness Progress Meter */}
      <div className="rounded-3xl border border-[#e5e9e1] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-6 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="size-5 text-[#86a018] dark:text-[#d9f447]" />
            <h3 className="font-extrabold text-sm text-[#18201c] dark:text-white">
              Overall Neural Model Pipeline Readiness
            </h3>
          </div>
          <span className="font-mono text-sm font-black text-[#86a018] dark:text-[#d9f447] bg-[#f0f6d6] dark:bg-[#121815] px-3 py-1 rounded-full border border-[#dce8b0] dark:border-[#27342d]">
            88% Complete
          </span>
        </div>
        <div className="h-3 w-full rounded-full bg-gray-100 dark:bg-[#121815] overflow-hidden p-0.5 border border-gray-200 dark:border-[#27342d]">
          <div className="h-full rounded-full bg-gradient-to-r from-[#86a018] via-[#d9f447] to-purple-500 transition-all duration-1000 w-[88%]" />
        </div>
        <div className="flex justify-between text-[11px] font-semibold text-gray-500 dark:text-gray-400 pt-1">
          <span>Data Ingestion &amp; Sanitization</span>
          <span>Transformer Training</span>
          <span>Hyperparameter Tuning</span>
          <span className="text-[#18201c] dark:text-white font-bold">Public Beta Release Q4</span>
        </div>
      </div>

      {/* Upcoming AI Modules Grid */}
      <div>
        <h3 className="text-lg font-black text-[#18201c] dark:text-white mb-4 flex items-center gap-2">
          <Brain className="size-5 text-purple-600 dark:text-purple-400" />
          <span>Upcoming AI Analytics Modules</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {aiFeatures.map((feat) => {
            const Icon = feat.icon
            return (
              <div
                key={feat.id}
                className="group relative flex flex-col justify-between rounded-3xl border border-[#e5e9e1] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-6 shadow-sm transition hover:shadow-md hover:border-[#86a018]/50"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="grid size-11 place-items-center rounded-2xl bg-[#f5f8ec] dark:bg-[#121815] text-[#738814] dark:text-[#d9f447] border border-[#e1ebbd] dark:border-[#27342d]">
                      <Icon className="size-5" />
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-[10px] font-extrabold border ${feat.badgeColor}`}
                    >
                      {feat.status}
                    </span>
                  </div>

                  <h4 className="mt-4 font-bold text-base text-[#18201c] dark:text-white group-hover:text-[#687e11] dark:group-hover:text-[#d9f447] transition">
                    {feat.title}
                  </h4>
                  <p className="mt-2 text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                    {feat.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100 dark:border-[#27342d] flex items-center justify-between text-xs">
                  <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500">
                    Development Status
                  </span>
                  <span className="font-mono font-bold text-[#18201c] dark:text-white">
                    {feat.progress}%
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
