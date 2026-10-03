import PolicyLayout from '@/components/PolicyLayout'

export const metadata = {
  title: 'Cookie Settings & Policy | crave.',
  description: 'Detailed Cookie Policy explaining browser cookies, tracking cookies, analytics, and preference settings at crave.',
}

export default function CookiesPolicyPage() {
  return (
    <PolicyLayout
      title="Cookie Settings & Policy"
      lastUpdated="February 19, 2026"
      activeDoc="cookies"
    >
      <div className="space-y-10 text-gray-700">
        <section className="space-y-3">
          <h2 className="text-xl font-extrabold text-[#18201c] flex items-center gap-2 border-b border-gray-100 pb-2">
            <span className="text-[#849e16]">1.</span> What Are Cookies?
          </h2>
          <p className="leading-relaxed">
            Cookies are small text files placed on your computer, smartphone, or tablet when you visit websites or mobile web applications. They are widely used to make web applications work more efficiently, store user preferences, maintain active session logins, and provide analytical telemetry to platform operators.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-extrabold text-[#18201c] flex items-center gap-2 border-b border-gray-100 pb-2">
            <span className="text-[#849e16]">2.</span> Categories of Cookies Used by crave.
          </h2>
          <p className="leading-relaxed">
            <strong className="text-[#18201c]">crave.</strong> uses four primary categories of cookies:
          </p>

          <div className="space-y-3">
            <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-200">
              <h3 className="font-bold text-[#18201c] text-base mb-1">A. Strictly Necessary / Essential Cookies</h3>
              <p className="text-xs text-gray-600">Essential for core platform operation, secure authentication tokens, cart item persistence in Crave XP Instamart, and payment session security. These cookies cannot be disabled in our systems.</p>
            </div>

            <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-200">
              <h3 className="font-bold text-[#18201c] text-base mb-1">B. Performance &amp; Analytics Cookies</h3>
              <p className="text-xs text-gray-600">Collect aggregated, anonymized data about how customers interact with merchant menus, page load speeds, and delivery map telemetry to help us diagnose performance bottlenecks.</p>
            </div>

            <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-200">
              <h3 className="font-bold text-[#18201c] text-base mb-1">C. Functionality &amp; Preference Cookies</h3>
              <p className="text-xs text-gray-600">Remember your saved delivery address choices along the Kanakapura Road Corridor, language preferences, dietary filters (Veg/Non-Veg), and custom search history.</p>
            </div>

            <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-200">
              <h3 className="font-bold text-[#18201c] text-base mb-1">D. Targeting &amp; Promotional Cookies</h3>
              <p className="text-xs text-gray-600">Allow us and partner networks to deliver relevant discount offers, restaurant deal vouchers, and Crave Pass membership promotions tailored to your dining habits.</p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-extrabold text-[#18201c] flex items-center gap-2 border-b border-gray-100 pb-2">
            <span className="text-[#849e16]">3.</span> Managing Cookie Preferences
          </h2>
          <p className="leading-relaxed">
            You can modify your browser settings to decline or clear cookies at any time. Most browsers (Chrome, Safari, Firefox, Edge) automatically accept cookies by default, but you can adjust your browser settings under <code className="text-[#5e720d]">Privacy &amp; Security</code>. Please note that disabling essential cookies may affect app functionality such as keeping items in your cart.
          </p>
        </section>
      </div>
    </PolicyLayout>
  )
}
