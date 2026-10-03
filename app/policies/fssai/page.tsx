import PolicyLayout from '@/components/PolicyLayout'

export const metadata = {
  title: 'FSSAI & Food Hygiene Standards | crave.',
  description: 'FSSAI licensing requirements, hygiene rating guidelines, dark store quality audits, and food safety compliance at crave.',
}

export default function FSSAIPolicyPage() {
  return (
    <PolicyLayout
      title="FSSAI Guidelines & Food Safety"
      lastUpdated="February 19, 2026"
      activeDoc="fssai"
    >
      <div className="space-y-10 text-gray-700">
        <section className="space-y-3">
          <h2 className="text-xl font-extrabold text-[#18201c] flex items-center gap-2 border-b border-gray-100 pb-2">
            <span className="text-[#849e16]">1.</span> FSSAI Regulatory Mandate
          </h2>
          <p className="leading-relaxed">
            In compliance with the Food Safety and Standards Act, 2006 and regulations framed thereunder by the Food Safety and Standards Authority of India (FSSAI), <strong className="text-[#18201c]">crave.</strong> enforces strict food hygiene, licensing, and traceability standards across all listed Merchant Partners and Crave XP Instamart dark stores.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-extrabold text-[#18201c] flex items-center gap-2 border-b border-gray-100 pb-2">
            <span className="text-[#849e16]">2.</span> Merchant Onboarding &amp; License Display
          </h2>
          <p className="leading-relaxed">
            Every restaurant partner, cloud kitchen, bakery, and beverage outlet onboarding onto the crave. Platform must present a valid 14-digit FSSAI Registration or State/Central License number.
          </p>

          <div className="space-y-3">
            <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-200">
              <h3 className="font-bold text-[#18201c] text-base mb-1">A. Mandatory Menu License Visibility</h3>
              <p className="text-xs text-gray-600">The 14-digit FSSAI license number of every merchant is displayed on their digital menu storefront on crave., allowing customers to verify food safety credentials prior to ordering.</p>
            </div>

            <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-200">
              <h3 className="font-bold text-[#18201c] text-base mb-1">B. Crave XP Dark Store Quality Audits</h3>
              <p className="text-xs text-gray-600">Our Crave XP micro-hubs along Kanakapura Road undergo bi-weekly hygiene audits, cold chain temperature logging (2°C to 8°C for dairy and fresh produce), and pest management reviews.</p>
            </div>

            <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-200">
              <h3 className="font-bold text-[#18201c] text-base mb-1">C. Tamper-Evident Packaging</h3>
              <p className="text-xs text-gray-600">Merchants are mandated to package hot food using tamper-evident seals or security stickers to prevent food contamination during transit.</p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-extrabold text-[#18201c] flex items-center gap-2 border-b border-gray-100 pb-2">
            <span className="text-[#849e16]">3.</span> Food Safety Grievance Escalation
          </h2>
          <p className="leading-relaxed">
            If you receive a food order with quality concerns, spoilage, or foreign objects, please report it immediately through your order details screen or contact our Food Safety Audit Team at <code className="text-[#5e720d]">foodsafety@crave.app</code>. We investigate food safety complaints within 2 hours and initiate merchant hygiene inspections where required.
          </p>
        </section>
      </div>
    </PolicyLayout>
  )
}
