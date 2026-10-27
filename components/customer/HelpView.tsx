'use client'

import {
  Bike,
  ChevronDown,
  ChevronUp,
  Clock,
  Headphones,
  KeyRound,
  MessageSquare,
  PhoneCall,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react'
import { useState } from 'react'

const FAQ_ITEMS = [
  {
    id: 'cancellation-policy',
    category: 'Order Cancellations',
    question: 'Can I cancel my order, and what is the cancellation window?',
    answer:
      'Yes, orders can be cancelled strictly within the first 15 seconds after placement directly from your active order screen. Once 15 seconds have passed, our restaurant partners immediately begin food preparation and packaging. Cancellations are locked after 15 seconds to prevent food wastage and protect kitchen staff.',
  },
  {
    id: 'refund-timeline',
    category: 'Refund Queue & Reversals',
    question: 'I cancelled within 15 seconds. When and how will I receive my refund?',
    answer:
      'When an order is cancelled within the 15-second window, it is automatically added to our Admin Refund Review Queue. Our team verifies the transaction and releases the refund directly to your original payment method (UPI, Debit/Credit Card, or NetBanking). The reversal typically reflects within 2 to 4 business days.',
  },
  {
    id: 'direct-support',
    category: 'Customer Support Hotline',
    question: 'How do I speak to someone if I need urgent help?',
    answer:
      'You can reach our dedicated customer support team directly at +91 96256 94673 anytime, 24 hours a day, 7 days a week. You can also chat with us on WhatsApp at the same number (+91 96256 94673).',
  },
  {
    id: 'delivery-otp',
    category: 'Delivery OTP Security',
    question: 'Where can I find my 6-digit Delivery OTP?',
    answer:
      'Your 6-digit delivery OTP is displayed securely on your Live Order Tracking screen once a delivery partner accepts and picks up your parcel from the kitchen. Share this OTP only with the delivery partner at your doorstep when they hand you your order.',
  },
  {
    id: 'tracking-partner',
    category: 'Live Tracking & ETA',
    question: 'How do I track my delivery partner or call them?',
    answer:
      'Live road GPS tracking activates as soon as a delivery partner accepts and picks up your parcel. Their vehicle icon will move on the live road map toward your doorstep. You will also see their verified name and a direct "Call Partner" button.',
  },
  {
    id: 'damaged-missing',
    category: 'Food Quality & Disputes',
    question: 'What if an item is missing, incorrect, or food arrived damaged?',
    answer:
      'We sincerely apologize! Please keep the packaging intact, take a photo, and call our priority customer care immediately at +91 96256 94673 within 30 minutes of delivery with your Order ID. Our team will promptly issue a replacement or refund.',
  },
  {
    id: 'payment-deducted-order-failed',
    category: 'Payment Delays',
    question: 'Money was deducted from my bank/UPI app, but the order failed?',
    answer:
      'If your bank debited money without order creation, your bank typically reverses the amount within 24-48 hours. If it does not reflect, please call us at +91 96256 94673 with your 12-digit UTR reference number.',
  },
]

interface HelpViewProps {
  onViewActiveOrder: () => void
}

export default function HelpView({ onViewActiveOrder }: HelpViewProps) {
  const [helpSearchQuery, setHelpSearchQuery] = useState('')
  const [openFaqId, setOpenFaqId] = useState<string | null>('cancellation-policy')

  const filteredFaqs = FAQ_ITEMS.filter((faq) => {
    if (!helpSearchQuery.trim()) return true
    const q = helpSearchQuery.toLowerCase()
    return (
      faq.question.toLowerCase().includes(q) ||
      faq.answer.toLowerCase().includes(q) ||
      faq.category.toLowerCase().includes(q)
    )
  })

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6 px-1 sm:px-0 animate-in fade-in duration-200">
      {/* Top 24/7 Priority Helpline Hero Banner - Apple Solid Style */}
      <div className="rounded-2xl bg-[#1C1C1E] dark:bg-[#161617] p-6 sm:p-8 text-white relative overflow-hidden border border-black/[0.08] dark:border-white/[0.08] shadow-sm">
        <div className="relative z-10 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-[#d9f447]/20 border border-[#d9f447]/40 text-[#d9f447] text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-[#d9f447] animate-ping" />
              24/7 Priority Support Helpline
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
            Need Help with an Order? Reach Out Directly
          </h2>
          <p className="text-xs sm:text-sm text-gray-300 max-w-2xl leading-relaxed">
            Have an urgent question about a live order, cancellation window, refund queue, or
            delivery partner? Reach our dedicated customer desk directly.
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-3">
            <a
              href="tel:+919625694673"
              className="inline-flex items-center gap-2.5 rounded-full bg-[#d9f447] hover:bg-[#c8e434] px-6 py-3 text-xs sm:text-sm font-black text-[#18201c] shadow-lg transition hover:scale-105 active:scale-95"
            >
              <PhoneCall className="size-4 text-[#18201c]" />
              <span>Call Helpline: +91 96256 94673</span>
            </a>

            <a
              href="https://wa.me/919625694673?text=Hi%20Crave%20Support,%20I%20need%20help%20with%20my%20order"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 px-6 py-3 text-xs sm:text-sm font-black text-white shadow-lg transition hover:scale-105 active:scale-95"
            >
              <MessageSquare className="size-4" />
              <span>WhatsApp: +91 96256 94673</span>
            </a>

            <button
              onClick={onViewActiveOrder}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 hover:bg-white/20 px-5 py-3 text-xs font-bold text-white transition cursor-pointer"
            >
              <Bike className="size-4 text-[#d9f447]" />
              <span>View Active Order</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Policies Highlight Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="rounded-2xl border border-gray-200 dark:border-[#27342d] bg-white dark:bg-[#18201c] p-4 shadow-xs">
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-extrabold text-xs">
            <Clock className="size-4" />
            <span>15-Second Cancellation</span>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
            Cancel anytime within the first 15 seconds after placement with 1 tap.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-[#27342d] bg-white dark:bg-[#18201c] p-4 shadow-xs">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-extrabold text-xs">
            <ShieldCheck className="size-4" />
            <span>Admin Refund Review Queue</span>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
            Cancelled payments are safely queued and verified for rapid reversal.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-[#27342d] bg-white dark:bg-[#18201c] p-4 shadow-xs">
          <div className="flex items-center gap-2 text-[#7f9815] dark:text-[#d9f447] font-extrabold text-xs">
            <KeyRound className="size-4" />
            <span>Secure 6-Digit Delivery OTP</span>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
            Only disclose your OTP to the driver at your door upon receiving your food.
          </p>
        </div>
      </div>

      {/* Search Input */}
      <div className="rounded-2xl border border-gray-200 dark:border-[#27342d] bg-white dark:bg-[#18201c] p-4 shadow-xs">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search frequently asked questions (e.g. cancellation, refund, otp, payment)..."
            value={helpSearchQuery}
            onChange={(e) => setHelpSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-gray-200 dark:border-[#27342d] bg-gray-50 dark:bg-[#121815] pl-10 pr-4 py-2.5 text-xs text-[#18201c] dark:text-white placeholder-gray-400 outline-none focus:border-[#d9f447] transition"
          />
          {helpSearchQuery && (
            <button
              onClick={() => setHelpSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* FAQ Accordion List */}
      <div className="rounded-3xl border border-gray-200 dark:border-[#27342d] bg-white dark:bg-[#18201c] p-6 shadow-xs space-y-3">
        <div className="border-b border-gray-100 dark:border-[#27342d] pb-3 mb-2 flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-sm sm:text-base text-[#18201c] dark:text-white">
              Frequently Asked Questions
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Instant answers to common customer queries
            </p>
          </div>
          <span className="text-xs font-bold text-[#7f9815] dark:text-[#d9f447]">
            {filteredFaqs.length} Help Topics
          </span>
        </div>

        {filteredFaqs.map((faq) => {
          const isOpen = openFaqId === faq.id
          return (
            <div
              key={faq.id}
              className="rounded-2xl border border-gray-200 dark:border-[#27342d] bg-gray-50/60 dark:bg-[#121815] overflow-hidden transition"
            >
              <button
                type="button"
                onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                className="w-full flex items-center justify-between p-4 text-left font-extrabold text-xs sm:text-sm text-[#18201c] dark:text-white hover:bg-gray-100/50 dark:hover:bg-white/5 transition cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-3">
                  <span className="px-2 py-0.5 rounded-md bg-[#d9f447]/20 text-[#718b0f] dark:text-[#d9f447] text-[10px] font-black uppercase tracking-wider shrink-0">
                    {faq.category}
                  </span>
                  <span className="truncate">{faq.question}</span>
                </div>
                {isOpen ? (
                  <ChevronUp className="size-4 shrink-0 text-[#718b0f] dark:text-[#d9f447]" />
                ) : (
                  <ChevronDown className="size-4 shrink-0 text-gray-400" />
                )}
              </button>

              {isOpen && (
                <div className="px-4 pb-4 pt-1 text-xs text-gray-600 dark:text-gray-300 border-t border-gray-100 dark:border-[#1e2722] leading-relaxed animate-in fade-in duration-150">
                  {faq.answer}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Bottom Direct Contact Footer */}
      <div className="rounded-3xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-2xl bg-[#f4f7ed] dark:bg-[#27342d] text-[#b5de28] dark:text-[#d9f447] shrink-0">
            <Headphones className="size-5" />
          </div>
          <div>
            <h4 className="font-extrabold text-xs sm:text-sm text-[#18201c] dark:text-white">
              Still need help?
            </h4>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Call our customer assistance team directly at{' '}
              <strong className="text-[#18201c] dark:text-white font-mono">
                -9625694673
              </strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href="tel:+919625694673"
            className="rounded-xl bg-[#18201c] dark:bg-[#d9f447] px-5 py-2.5 text-xs font-black text-white dark:text-[#18201c] hover:bg-[#2a3831] dark:hover:bg-[#c8e434] transition shadow-xs flex items-center gap-2"
          >
            <PhoneCall className="size-3.5" />
            <span>Call -9625694673</span>
          </a>
        </div>
      </div>
    </div>
  )
}
