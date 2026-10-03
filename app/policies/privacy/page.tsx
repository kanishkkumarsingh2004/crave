import PolicyLayout from '@/components/PolicyLayout'

export const metadata = {
  title: 'Privacy Policy | crave.',
  description:
    'Comprehensive Privacy Policy governing data collection, telemetry usage, and user rights on the crave. platform.',
}

export default function PrivacyPolicyPage() {
  return (
    <PolicyLayout title="Privacy Policy" lastUpdated="February 19, 2026" activeDoc="privacy">
      <div className="space-y-10 text-gray-700">
        {/* Section 1 */}
        <section className="space-y-3">
          <h2 className="text-xl font-extrabold text-[#18201c] flex items-center gap-2 border-b border-gray-100 pb-2">
            <span className="text-[#849e16]">1.</span> Applicability and Scope
          </h2>
          <p className="leading-relaxed">
            <strong className="text-[#18201c]">crave. Technologies India Limited</strong> (formerly
            known as Crave App Solutions Pvt. Ltd.) and its operating subsidiaries
            (&quot;crave.&quot;, &quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; or
            &quot;our&quot;) respect your privacy and are committed to protecting your personal
            data. This Privacy Policy describes how we collect, process, store, disclose, and
            safeguard your personal information when you access or use the crave. mobile
            applications, website at <code className="text-[#5e720d]">https://crave.app</code>,
            Crave XP Instamart delivery network, and associated API integrations (collectively, the
            &quot;Services&quot;).
          </p>
          <p className="leading-relaxed">
            By accessing or using our Services, registering an account, or interacting with our
            merchants and delivery partners along the Kanakapura Road Corridor and greater Bengaluru
            region, you consent to the data collection and processing practices described herein.
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-4">
          <h2 className="text-xl font-extrabold text-[#18201c] flex items-center gap-2 border-b border-gray-100 pb-2">
            <span className="text-[#849e16]">2.</span> Information We Collect
          </h2>
          <p className="leading-relaxed">
            We collect several categories of information from and about users of our Services:
          </p>

          <div className="space-y-3 pl-2">
            <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-200">
              <h3 className="font-bold text-[#18201c] text-base mb-1">
                A. Information You Provide Directly
              </h3>
              <ul className="list-disc pl-5 space-y-1.5 text-xs text-gray-600">
                <li>
                  <strong className="text-gray-900">Account Credentials:</strong> Full name,
                  verified mobile number, email address, profile avatar, and saved delivery
                  addresses.
                </li>
                <li>
                  <strong className="text-gray-900">Payment Metadata:</strong> Transaction reference
                  IDs, preferred payment methods (UPI IDs, card tokenization details), and billing
                  address. We do not store raw card CVVs or bank PINs.
                </li>
                <li>
                  <strong className="text-gray-900">Communications &amp; Feedback:</strong> Customer
                  support chats, order delivery instructions, voice call recordings via masked proxy
                  lines, and restaurant review ratings.
                </li>
              </ul>
            </div>

            <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-200">
              <h3 className="font-bold text-[#18201c] text-base mb-1">
                B. Information Collected Automatically
              </h3>
              <ul className="list-disc pl-5 space-y-1.5 text-xs text-gray-600">
                <li>
                  <strong className="text-gray-900">Precise Location Telemetry:</strong>{' '}
                  High-accuracy GPS coordinates collected while the app is active in the foreground
                  or background during active order fulfillment to calculate accurate ETAs and route
                  delivery partners.
                </li>
                <li>
                  <strong className="text-gray-900">Device &amp; Telemetry Data:</strong> IP
                  address, device hardware model, operating system version, unique device identifier
                  (UUID), network operator, and push notification tokens.
                </li>
                <li>
                  <strong className="text-gray-900">Usage Analytics:</strong> Browsing history, food
                  search queries, items added to Crave XP grocery carts, clickstream pathways, and
                  time spent on specific merchant menus.
                </li>
              </ul>
            </div>

            <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-200">
              <h3 className="font-bold text-[#18201c] text-base mb-1">
                C. Information From Third Parties
              </h3>
              <ul className="list-disc pl-5 space-y-1.5 text-xs text-gray-600">
                <li>
                  Authentication data from single sign-on (SSO) providers (e.g., Google OAuth, Apple
                  ID).
                </li>
                <li>
                  Delivery confirmation telemetry and OTP verification updates from independent
                  driver partners.
                </li>
                <li>
                  Fraud prevention metrics and risk assessment scores from accredited payment
                  gateways.
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Section 3 */}
        <section className="space-y-3">
          <h2 className="text-xl font-extrabold text-[#18201c] flex items-center gap-2 border-b border-gray-100 pb-2">
            <span className="text-[#849e16]">3.</span> How We Use Your Information
          </h2>
          <p className="leading-relaxed">
            We process your personal information for specific, legitimate operational purposes:
          </p>
          <ul className="list-disc pl-5 space-y-2 leading-relaxed">
            <li>
              <strong className="text-[#18201c]">Order Fulfillment &amp; Dispatch:</strong>{' '}
              Transmitting order items to restaurant kitchens or Crave XP dark store fulfillment
              managers, routing nearby driver partners, and tracking real-time delivery telemetry.
            </li>
            <li>
              <strong className="text-[#18201c]">Customer Support &amp; Dispute Resolution:</strong>{' '}
              Responding to order inquiries, refund requests, delivery delays, and quality assurance
              complaints.
            </li>
            <li>
              <strong className="text-[#18201c]">Platform Personalization:</strong> Recommending
              hyper-local restaurants, curated dish suggestions, and personalized promotional deals
              based on order history.
            </li>
            <li>
              <strong className="text-[#18201c]">Safety &amp; Fraud Prevention:</strong> Detecting
              fraudulent transactions, unauthorized account logins, driver spoofing, and compliance
              violations under Indian law.
            </li>
            <li>
              <strong className="text-[#18201c]">Legal Compliance:</strong> Retaining financial
              transaction records for tax compliance, GST invoicing, and regulatory audits under the
              Information Technology Act, 2000.
            </li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className="space-y-3">
          <h2 className="text-xl font-extrabold text-[#18201c] flex items-center gap-2 border-b border-gray-100 pb-2">
            <span className="text-[#849e16]">4.</span> Disclosure of Information to Third Parties
          </h2>
          <p className="leading-relaxed">
            We do not sell your personal data. We disclose your information only to necessary
            operational partners:
          </p>
          <div className="grid gap-3 sm:grid-cols-2 pt-2">
            <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-200">
              <h4 className="font-bold text-[#18201c] mb-1 text-sm">
                Restaurant &amp; Dark Store Partners
              </h4>
              <p className="text-xs text-gray-600">
                Order items, customer first name, delivery address line, and special cooking
                instructions required to prepare and package food.
              </p>
            </div>
            <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-200">
              <h4 className="font-bold text-[#18201c] mb-1 text-sm">
                Delivery Partners &amp; Drivers
              </h4>
              <p className="text-xs text-gray-600">
                Delivery destination coordinates, contact phone masking link, and recipient customer
                name to complete drop-off.
              </p>
            </div>
            <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-200">
              <h4 className="font-bold text-[#18201c] mb-1 text-sm">
                Payment Processors &amp; Banking Partners
              </h4>
              <p className="text-xs text-gray-600">
                Encrypted token IDs and transaction sums to complete UPI, card, and net-banking
                checkouts securely.
              </p>
            </div>
            <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-200">
              <h4 className="font-bold text-[#18201c] mb-1 text-sm">
                Regulatory Authorities &amp; Law Enforcement
              </h4>
              <p className="text-xs text-gray-600">
                When mandated under valid judicial orders, court summons, or regulatory inquiries
                under Indian law.
              </p>
            </div>
          </div>
        </section>

        {/* Section 5 */}
        <section className="space-y-3">
          <h2 className="text-xl font-extrabold text-[#18201c] flex items-center gap-2 border-b border-gray-100 pb-2">
            <span className="text-[#849e16]">5.</span> Data Security &amp; Retention Policy
          </h2>
          <p className="leading-relaxed">
            crave. employs industry-standard encryption protocols (TLS 1.3 in transit, AES-256 at
            rest) to safeguard user data. We retain personal data for as long as your account
            remains active or as required by applicable tax, statutory, and legal retention laws in
            India.
          </p>
        </section>

        {/* Section 6 */}
        <section className="space-y-3">
          <h2 className="text-xl font-extrabold text-[#18201c] flex items-center gap-2 border-b border-gray-100 pb-2">
            <span className="text-[#849e16]">6.</span> Your Rights &amp; Account Deletion
          </h2>
          <p className="leading-relaxed">
            You have the right to access, update, or correct your profile data at any time via your
            account settings. You may also request complete deletion of your account and personal
            records by contacting our Privacy Officer at{' '}
            <code className="text-[#5e720d]">privacy@crave.app</code>.
          </p>
        </section>

        {/* Section 7 */}
        <section className="space-y-3 bg-gray-50 p-5 rounded-2xl border border-gray-200">
          <h2 className="text-lg font-extrabold text-[#18201c] mb-2">
            Grievance Redressal Officer
          </h2>
          <p className="text-xs text-gray-600 leading-relaxed">
            In accordance with the Information Technology Act, 2000 and rules made thereunder, the
            name and contact details of the Grievance Officer are provided below:
          </p>
          <div className="mt-3 text-xs text-gray-700 space-y-1 font-mono">
            <p>
              <strong className="text-[#18201c]">Grievance Officer:</strong> Anand Kumar
            </p>
            <p>
              <strong className="text-[#18201c]">Designation:</strong> Head of Data Privacy &amp;
              Legal Compliance
            </p>
            <p>
              <strong className="text-[#18201c]">Address:</strong> crave. Tech Park, 4th Floor,
              Kanakapura Main Road, Bengaluru, Karnataka - 560062
            </p>
            <p>
              <strong className="text-[#18201c]">Email:</strong>{' '}
              <span className="text-[#5e720d]">grievance@crave.app</span>
            </p>
          </div>
        </section>
      </div>
    </PolicyLayout>
  )
}
