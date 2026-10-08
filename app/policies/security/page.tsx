import PolicyLayout from '@/components/PolicyLayout'

export const metadata = {
  title: 'Security & Vulnerabilities | crave.',
  description:
    'Enterprise security standards, cloud architecture, SSL/TLS encryption, and bug bounty disclosure procedures at crave.',
}

export default function SecurityPolicyPage() {
  return (
    <PolicyLayout
      title="Security & Vulnerabilities"
      lastUpdated="February 19, 2026"
      activeDoc="security"
    >
      <div className="space-y-10 text-gray-700">
        <section className="space-y-3">
          <h2 className="text-xl font-extrabold text-[#18201c] flex items-center gap-2 border-b border-gray-100 pb-2">
            <span className="text-[#b5de28]">1.</span> Enterprise Infrastructure Security
          </h2>
          <p className="leading-relaxed">
            At <strong className="text-[#18201c]">crave.</strong>, security is built into every
            layer of our platform. Our cloud infrastructure is hosted in ISO 27001 and SOC 2 Type II
            certified data centers. All network traffic between your client device and our API
            servers is protected by TLS 1.3 encryption with strict HTTPS enforcement.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-extrabold text-[#18201c] flex items-center gap-2 border-b border-gray-100 pb-2">
            <span className="text-[#b5de28]">2.</span> Data Protection &amp; Access Controls
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-200">
              <h3 className="font-bold text-[#18201c] text-sm mb-1">AES-256 Encryption at Rest</h3>
              <p className="text-xs text-gray-600">
                All customer databases, payment tokens, address records, and order histories are
                encrypted using strong AES-256 keys.
              </p>
            </div>
            <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-200">
              <h3 className="font-bold text-[#18201c] text-sm mb-1">Phone Number Masking</h3>
              <p className="text-xs text-gray-600">
                Calls between delivery partners and customers use encrypted proxy telephony lines to
                keep personal phone numbers 100% private.
              </p>
            </div>
            <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-200">
              <h3 className="font-bold text-[#18201c] text-sm mb-1">PCI-DSS Payment Compliance</h3>
              <p className="text-xs text-gray-600">
                All card transactions are routed directly through PCI-DSS Level 1 compliant gateways
                (Razorpay/PayTM/UPI hubs).
              </p>
            </div>
            <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-200">
              <h3 className="font-bold text-[#18201c] text-sm mb-1">
                Role-Based Access Control (RBAC)
              </h3>
              <p className="text-xs text-gray-600">
                Merchant console operators and internal staff have strictly audited,
                principle-of-least-privilege access permissions.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-extrabold text-[#18201c] flex items-center gap-2 border-b border-gray-100 pb-2">
            <span className="text-[#b5de28]">3.</span> Vulnerability Disclosure &amp; Bug Bounty
          </h2>
          <p className="leading-relaxed">
            We welcome security researchers and ethical hackers to report vulnerabilities under our
            Responsible Disclosure Program. If you discover a potential security flaw in crave.
            services:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-gray-700 leading-relaxed">
            <li>
              Email details directly to <code className="text-[#5e720d]">security@crave.app</code>{' '}
              with step-by-step reproduction instructions.
            </li>
            <li>
              Do not access, alter, or breach customer accounts or production data during testing.
            </li>
            <li>
              Give us a reasonable window of 14 calendar days to patch reported vulnerabilities
              prior to public disclosure.
            </li>
          </ul>
        </section>
      </div>
    </PolicyLayout>
  )
}
