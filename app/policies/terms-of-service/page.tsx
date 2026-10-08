import PolicyLayout from '@/components/PolicyLayout'

export const metadata = {
  title: 'Terms of Service | crave.',
  description:
    'Exhaustive Terms of Service and legal agreements governing the use of crave. food delivery, Crave XP Instamart, and platform services.',
}

const SECTIONS = [
  { id: 'i-acceptance-of-terms', title: 'I. Acceptance of terms' },
  { id: 'ii-definitions', title: 'II. Definitions' },
  { id: 'iii-eligibility-to-use-the-services', title: 'III. Eligibility to use the services' },
  { id: 'iv-changes-to-the-terms', title: 'IV. Changes to the terms' },
  { id: 'v-translation-of-the-terms', title: 'V. Translation of the terms' },
  { id: 'vi-provision-of-services', title: 'VI. Provision of the services offered by crave.' },
  { id: 'vii-use-of-services', title: 'VII. Use of services by you or Customer' },
  { id: 'viii-content', title: 'VIII. Content & Intellectual Property' },
  { id: 'ix-content-guidelines-and-privacy', title: 'IX. Content guidelines and privacy policy' },
  { id: 'x-restrictions-on-use', title: 'X. Restrictions on use' },
  { id: 'xi-customer-feedback', title: 'XI. Customer feedback & submissions' },
  { id: 'xii-advertising', title: 'XII. Advertising & promotions' },
  { id: 'xiii-additional-terms', title: 'XIII. Additional Terms for crave. Services' },
  {
    id: 'xiv-disclaimer-and-limitation',
    title: 'XIV. Disclaimer of warranties & limitation of liability',
  },
  { id: 'xv-termination', title: 'XV. Termination of your access' },
  { id: 'xvi-general-terms', title: 'XVI. General terms' },
  { id: 'xvii-notice-of-copyright', title: 'XVII. Notice of copyright infringement' },
  { id: 'xviii-contact-us', title: 'XVIII. Contact Us & Grievance Redressal' },
]

export default function TermsOfServicePage() {
  return (
    <PolicyLayout
      title="Terms of Service"
      lastUpdated="February 19, 2026"
      activeDoc="terms-of-service"
    >
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        {/* MAIN DOCUMENT TEXT */}
        <div className="xl:col-span-3 space-y-12 text-gray-700 text-sm leading-relaxed">
          {/* Section I */}
          <section id="i-acceptance-of-terms" className="space-y-4 scroll-mt-28">
            <h2 className="text-xl font-extrabold text-[#18201c] flex items-center gap-2 border-b border-gray-200 pb-2">
              <span className="text-[#b5de28]">I.</span> Acceptance of terms
            </h2>
            <p>
              Thank you for using <strong className="text-[#18201c]">crave.</strong>. These Terms of
              Service (the &quot;Terms&quot;) are intended to make you aware of your legal rights
              and responsibilities with respect to your access to and use of the crave. website at{' '}
              <code className="text-[#5e720d]">https://crave.app</code> (the &quot;Site&quot;) and
              any related mobile or software applications (&quot;crave. Platform&quot;) including
              but not limited to delivery of information via the website whether existing now or in
              the future that link to the Terms (collectively, the &quot;Services&quot;).
            </p>
            <p>
              <strong className="text-[#18201c]">
                These Terms are effective for all existing and future crave. customers, including
                but without limitation to users having access to &apos;restaurant business
                page&apos; to manage their claimed business listings.
              </strong>
            </p>
            <p>
              Please read these Terms carefully. By accessing or using the crave. Platform, you are
              agreeing to these Terms and concluding a legally binding contract with{' '}
              <strong className="text-[#18201c]">crave. Technologies India Limited</strong>{' '}
              (formerly known as Crave App Solutions Private Limited) and/or its affiliates
              (hereinafter collectively referred to as &quot;crave.&quot;). You may not use the
              Services if you do not accept the Terms or are unable to be bound by the Terms. Your
              use of the crave. Platform is at your own risk, including the risk that you might be
              exposed to content that is objectionable, or otherwise inappropriate.
            </p>
            <p>
              In order to use the Services, you must first agree to the Terms. You can accept the
              Terms by:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-gray-700">
              <li>
                Clicking to accept or agree to the Terms, where it is made available to you by
                crave. in the user interface for any particular Service; or
              </li>
              <li>
                Actually using the Services. In this case, you understand and agree that crave. will
                treat your use of the Services as acceptance of the Terms from that point onwards.
              </li>
            </ul>
          </section>

          {/* Section II */}
          <section id="ii-definitions" className="space-y-4 scroll-mt-28">
            <h2 className="text-xl font-extrabold text-[#18201c] flex items-center gap-2 border-b border-gray-200 pb-2">
              <span className="text-[#b5de28]">II.</span> Definitions
            </h2>
            <div className="space-y-3">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <h3 className="font-bold text-[#18201c] text-base mb-1">Customer</h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  &quot;Customer&quot; or &quot;You&quot; or &quot;Your&quot; refers to you, as a
                  customer of the Services. A customer is someone who accesses or uses the Services
                  for the purpose of sharing, displaying, hosting, publishing, transacting, or
                  uploading information or views or pictures and includes other persons jointly
                  participating in using the Services including without limitation a user having
                  access to &apos;restaurant business page&apos; to manage claimed business listings
                  or otherwise.
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <h3 className="font-bold text-[#18201c] text-base mb-1">Content</h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  &quot;Content&quot; will include (but is not limited to) reviews, images, photos,
                  audio, video, location data, nearby places, and all other forms of information or
                  data. &quot;Your Content&quot; or &quot;Customer Content&quot; means content that
                  you upload, share or transmit to, through or in connection with the Services, such
                  as likes, ratings, reviews, images, photos, messages, chat communication, profile
                  information, or any other materials that you publicly display in your account
                  profile. &quot;crave. Content&quot; means content that crave. creates and makes
                  available in connection with the Services including, but not limited to, visual
                  interfaces, interactive features, graphics, design, computer code, software,
                  aggregate ratings, and usage data excluding Your Content and Third Party Content.
                  &quot;Third Party Content&quot; means content that comes from parties other than
                  crave. or its Customers, such as Restaurant Partners and is available on the
                  Services.
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <h3 className="font-bold text-[#18201c] text-base mb-1">
                  Restaurant(s) / Restaurant Partner(s)
                </h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  &quot;Restaurant&quot; or &quot;Restaurant Partner&quot; means the restaurants,
                  cloud kitchens, bakeries, beverage outlets, and Crave XP Instamart dark stores
                  listed on the crave. Platform.
                </p>
              </div>
            </div>
          </section>

          {/* Section III */}
          <section id="iii-eligibility-to-use-the-services" className="space-y-4 scroll-mt-28">
            <h2 className="text-xl font-extrabold text-[#18201c] flex items-center gap-2 border-b border-gray-200 pb-2">
              <span className="text-[#b5de28]">III.</span> Eligibility to use the services
            </h2>
            <p>
              1. You hereby represent and warrant that you are at least eighteen (18) years of age
              or above and are fully able and competent to understand and agree to the terms,
              conditions, obligations, affirmations, representations, and warranties set forth in
              these Terms.
            </p>
            <p>
              2. <strong className="text-[#18201c]">Compliance with Laws:</strong> You are in
              compliance with all laws and regulations in the country in which you live when you
              access and use the Services. You agree to use the Services only in compliance with
              these Terms and applicable law, and in a manner that does not violate our legal rights
              or those of any third party(ies).
            </p>
          </section>

          {/* Section IV */}
          <section id="iv-changes-to-the-terms" className="space-y-4 scroll-mt-28">
            <h2 className="text-xl font-extrabold text-[#18201c] flex items-center gap-2 border-b border-gray-200 pb-2">
              <span className="text-[#b5de28]">IV.</span> Changes to the terms
            </h2>
            <p>
              crave. may vary or amend or change or update these Terms from time to time entirely at
              its own discretion. You shall be responsible for checking these Terms periodically to
              ensure continued compliance. Your use of the crave. Platform after any such amendment
              shall be deemed as your express acceptance of such amended terms.
            </p>
          </section>

          {/* Section V */}
          <section id="v-translation-of-the-terms" className="space-y-4 scroll-mt-28">
            <h2 className="text-xl font-extrabold text-[#18201c] flex items-center gap-2 border-b border-gray-200 pb-2">
              <span className="text-[#b5de28]">V.</span> Translation of the terms
            </h2>
            <p>
              crave. may provide a translation of the English version of the Terms into other
              languages. Any translation of the Terms into other languages is only for your
              convenience and the English version shall govern your relationship with crave.. If
              there are any inconsistencies between the English version and a translated version,
              the English version shall prevail.
            </p>
          </section>

          {/* Section VI */}
          <section id="vi-provision-of-services" className="space-y-4 scroll-mt-28">
            <h2 className="text-xl font-extrabold text-[#18201c] flex items-center gap-2 border-b border-gray-200 pb-2">
              <span className="text-[#b5de28]">VI.</span> Provision of the services offered by
              crave.
            </h2>
            <p>
              1. crave. is constantly evolving in order to provide the best possible experience and
              information to its Customers. You acknowledge and agree that the form and nature of
              the Services which crave. provides may require affecting certain changes in it,
              therefore crave. reserves the right to suspend, cancel, or discontinue any or all
              products or services at any time without notice.
            </p>
            <p>
              2. We or the app store that makes the software available for download may include
              functionality to automatically check for updates or upgrades to the software. You
              agree that we may provide notice to you of updates and automatically push updates to
              your device.
            </p>
            <p>
              3. crave. reserves the right to charge a subscription and/or membership fee (e.g.
              Crave Pass), fee for providing Platform Services (platform charges/fee), delivery
              surge, or VIP Mode fees (fastest possible delivery, top rated driver allocation) at
              any time.
            </p>
          </section>

          {/* Section VII */}
          <section id="vii-use-of-services" className="space-y-4 scroll-mt-28">
            <h2 className="text-xl font-extrabold text-[#18201c] flex items-center gap-2 border-b border-gray-200 pb-2">
              <span className="text-[#b5de28]">VII.</span> Use of services by you or Customer
            </h2>
            <h3 className="font-bold text-[#18201c] text-base">
              1. Customer Account &amp; Claim Business Listing
            </h3>
            <p>
              a. You must create an account in order to use some of the features offered by the
              Services. You must keep your password confidential and are solely responsible for
              maintaining the security of your account and all activities occurring under it.
            </p>
            <p>
              b. You may not impersonate someone else, create an account for anyone other than
              yourself, provide a false phone number/email address, or create multiple accounts.
              False claims of business listings may cause substantial economic damages for which you
              may be held legally liable.
            </p>

            <h3 className="font-bold text-[#18201c] text-base pt-2">
              2. Telephony Services &amp; Call Recording
            </h3>
            <p>
              In order to connect you to certain restaurants or delivery partners, we provide value
              added telephony services via proxy phone lines. We record call details and audio
              conversations for internal billing tracking and quality assurance purposes. By
              utilizing phone links on crave., you explicitly permit crave. to record and retain
              such audio.
            </p>
          </section>

          {/* Section VIII */}
          <section id="viii-content" className="space-y-4 scroll-mt-28">
            <h2 className="text-xl font-extrabold text-[#18201c] flex items-center gap-2 border-b border-gray-200 pb-2">
              <span className="text-[#b5de28]">VIII.</span> Content &amp; Intellectual Property
            </h2>
            <h3 className="font-bold text-[#18201c] text-base">
              1. Ownership of crave. Content &amp; Trademarks
            </h3>
            <p>
              We are the sole and exclusive copyright owners of the Services and crave. Content. We
              exclusively own the copyrights, trademarks, service marks, logos, trade names, and
              trade dress associated with <strong className="text-[#18201c]">crave.</strong>{' '}
              (including the baseline square green dot logo). You agree not to use framing
              techniques, scrape, or modify any crave. Content.
            </p>

            <h3 className="font-bold text-[#18201c] text-base pt-2">
              2. Synthetically Generated Content Declarations
            </h3>
            <p>
              By using our services, you agree that for any Content you upload, you will accurately
              and truthfully declare whether it is Synthetically Generated Information (AI-generated
              audio/video/text) when prompted. Providing false declarations constitutes a material
              breach of these Terms.
            </p>
          </section>

          {/* Section IX */}
          <section id="ix-content-guidelines-and-privacy" className="space-y-4 scroll-mt-28">
            <h2 className="text-xl font-extrabold text-[#18201c] flex items-center gap-2 border-b border-gray-200 pb-2">
              <span className="text-[#b5de28]">IX.</span> Content guidelines and privacy policy
            </h2>
            <p>
              You represent that you have read, understood and agreed to our Privacy Policy and
              Content Guidelines. Please note that we may disclose information about you to
              government authorities or third parties if we believe such disclosure is reasonably
              necessary to comply with legal process or protect safety under Indian law.
            </p>
          </section>

          {/* Section X */}
          <section id="x-restrictions-on-use" className="space-y-4 scroll-mt-28">
            <h2 className="text-xl font-extrabold text-[#18201c] flex items-center gap-2 border-b border-gray-200 pb-2">
              <span className="text-[#b5de28]">X.</span> Restrictions on use
            </h2>
            <p>
              Without limiting these Terms, you specifically agree NOT to post or transmit content
              that:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-xs text-gray-600">
              <li>
                Is harmful, abusive, harassing, defamatory, obscene, pornographic, or invasive of
                another&apos;s privacy;
              </li>
              <li>
                Contains child sexual abuse material, non-consensual intimate imagery, or synthetic
                deepfakes;
              </li>
              <li>
                Constitutes an inauthentic or paid review, or misrepresents restaurant experiences;
              </li>
              <li>
                Interferes with delivery partners, support agents, or uses abusive/derogatory
                language during chat support;
              </li>
              <li>Decompiles, reverse engineers, or scrapes crave. source code or data feeds.</li>
            </ul>
            <p className="text-xs bg-red-50 text-red-900 p-3 rounded-xl border border-red-200 font-medium">
              Abusive behavior towards delivery partners or customer support agents will result in
              immediate permanent account termination and legal reporting under the Bharatiya Nyaya
              Sanhita (BNS), 2023.
            </p>
          </section>

          {/* Section XI */}
          <section id="xi-customer-feedback" className="space-y-4 scroll-mt-28">
            <h2 className="text-xl font-extrabold text-[#18201c] flex items-center gap-2 border-b border-gray-200 pb-2">
              <span className="text-[#b5de28]">XI.</span> Customer feedback &amp; submissions
            </h2>
            <p>
              If you share suggestions or feedback regarding crave. Services, you grant crave. a
              perpetual, worldwide, royalty-free license to develop and commercialize such feedback
              without obligation or compensation to you.
            </p>
          </section>

          {/* Section XII */}
          <section id="xii-advertising" className="space-y-4 scroll-mt-28">
            <h2 className="text-xl font-extrabold text-[#18201c] flex items-center gap-2 border-b border-gray-200 pb-2">
              <span className="text-[#b5de28]">XII.</span> Advertising &amp; promotions
            </h2>
            <p>
              Some Services are supported by advertising revenue. Merchant promotional banners and
              sponsored listings are displayed on crave.. Advertisers are solely responsible for
              ensuring campaign material complies with applicable laws.
            </p>
          </section>

          {/* Section XIII */}
          <section id="xiii-additional-terms" className="space-y-6 scroll-mt-28">
            <h2 className="text-xl font-extrabold text-[#18201c] flex items-center gap-2 border-b border-gray-200 pb-2">
              <span className="text-[#b5de28]">XIII.</span> Additional Terms for crave. Services
            </h2>

            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <h3 className="font-bold text-[#18201c] text-base mb-2">
                  1. Food Ordering &amp; Delivery Services
                </h3>
                <p className="text-xs text-gray-600 leading-relaxed mb-2">
                  crave. enables food ordering and delivery by entering into contractual
                  arrangements with Restaurant Partners on a principal-to-principal basis. Delivery
                  may be undertaken directly by the Restaurant Partner or facilitated through
                  independent Delivery Partners.
                </p>
                <ul className="list-disc pl-5 space-y-1 text-xs text-gray-600">
                  <li>
                    <strong className="text-gray-900">On-Time Guarantee:</strong> On eligible
                    orders, if delivery exceeds promised time (except during extreme
                    rain/floods/strikes), customers receive an INR 100 coupon valid for 3 days.
                  </li>
                  <li>
                    <strong className="text-gray-900">Liquidated Damages for Cancellation:</strong>{' '}
                    Order cancellation after restaurant preparation begins incurs liquidated damages
                    equal to 100% of order value.
                  </li>
                  <li>
                    <strong className="text-gray-900">Gift Orders:</strong> Customers sending gift
                    food orders warrant that recipient consent has been obtained.
                  </li>
                </ul>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <h3 className="font-bold text-[#18201c] text-base mb-2">
                  2. Crave Pay &amp; Dining Discounts
                </h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Crave Pay allows customers to pay dining bills at partner restaurants directly via
                  the crave. app to unlock instant bill discounts and cashback scratch cards.
                  Exclusions apply on New Year&apos;s Eve, Valentine&apos;s Day, and Diwali.
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <h3 className="font-bold text-[#18201c] text-base mb-2">
                  3. Crave XP Instamart Dark Stores
                </h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Crave XP Instamart fulfills rapid grocery orders directly from micro-hubs along
                  Kanakapura Road Corridor. Stock availability is updated in real time.
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <h3 className="font-bold text-[#18201c] text-base mb-2">4. Food Hygiene Ratings</h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Hygiene ratings displayed on restaurant pages are provided by independent
                  certified FSSAI auditors for informational purposes on an &apos;as available&apos;
                  basis.
                </p>
              </div>
            </div>
          </section>

          {/* Section XIV */}
          <section id="xiv-disclaimer-and-limitation" className="space-y-4 scroll-mt-28">
            <h2 className="text-xl font-extrabold text-[#18201c] flex items-center gap-2 border-b border-gray-200 pb-2">
              <span className="text-[#b5de28]">XIV.</span> Disclaimer of warranties &amp; limitation
              of liability
            </h2>
            <p className="uppercase text-xs font-mono bg-gray-100 p-4 rounded-xl border border-gray-200 text-gray-800 leading-relaxed">
              THE SERVICES ARE PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot;. TO THE
              FULLEST EXTENT PERMITTED BY LAW, CRAVE. DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED.
              IN NO EVENT SHALL CRAVE. BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL
              DAMAGES ARISING FROM YOUR USE OF THE PLATFORM.
            </p>
          </section>

          {/* Section XV */}
          <section id="xv-termination" className="space-y-4 scroll-mt-28">
            <h2 className="text-xl font-extrabold text-[#18201c] flex items-center gap-2 border-b border-gray-200 pb-2">
              <span className="text-[#b5de28]">XV.</span> Termination of your access
            </h2>
            <p>
              You may delete your account at any time via Profile &gt; Settings &gt; Security &gt;
              Delete Account. crave. reserves the right to suspend or terminate accounts engaging in
              fraudulent orders, payment defaults, or rider harassment without prior notice.
            </p>
          </section>

          {/* Section XVI */}
          <section id="xvi-general-terms" className="space-y-4 scroll-mt-28">
            <h2 className="text-xl font-extrabold text-[#18201c] flex items-center gap-2 border-b border-gray-200 pb-2">
              <span className="text-[#b5de28]">XVI.</span> General terms
            </h2>
            <p>
              <strong className="text-[#18201c]">Governing Law &amp; Jurisdiction:</strong> These
              Terms shall be governed by the laws of India. Courts in{' '}
              <strong className="text-[#18201c]">Bengaluru, Karnataka</strong> shall have exclusive
              jurisdiction over any legal dispute.
            </p>
            <p>
              <strong className="text-[#18201c]">1-Year Limitation Period:</strong> YOU MUST
              COMMENCE ANY LEGAL ACTION AGAINST US WITHIN ONE (1) YEAR AFTER THE ALLEGED CAUSE OF
              ACTION ACCRUES.
            </p>
          </section>

          {/* Section XVII */}
          <section id="xvii-notice-of-copyright" className="space-y-4 scroll-mt-28">
            <h2 className="text-xl font-extrabold text-[#18201c] flex items-center gap-2 border-b border-gray-200 pb-2">
              <span className="text-[#b5de28]">XVII.</span> Notice of copyright infringement
            </h2>
            <p>
              If you believe copyrighted material is being infringed on crave., submit a takedown
              notice to <code className="text-[#5e720d]">legal@crave.app</code> specifying the exact
              URL, copyrighted work identifier, and sworn declaration under penalty of perjury.
            </p>
          </section>

          {/* Section XVIII */}
          <section
            id="xviii-contact-us"
            className="space-y-4 scroll-mt-28 bg-gray-50 p-6 rounded-2xl border border-gray-200"
          >
            <h2 className="text-lg font-extrabold text-[#18201c] border-b border-gray-200 pb-2">
              XVIII. Company Details &amp; Grievance Officers
            </h2>
            <div className="space-y-2 text-xs font-mono text-gray-800">
              <p>
                <strong className="text-[#18201c]">Legal Entity:</strong> crave. Technologies India
                Limited
              </p>
              <p>
                <strong className="text-[#18201c]">CIN:</strong> L93030KA2024PLC198141
              </p>
              <p>
                <strong className="text-[#18201c]">Corporate Office:</strong> crave. Tech Park, 4th
                Floor, Kanakapura Main Road, Sector 7, Bengaluru, Karnataka - 560062
              </p>
              <p>
                <strong className="text-[#18201c]">Support Helpline:</strong> +91 (080) 4117-1852
                (Mon-Fri, 9:00 AM - 6:00 PM)
              </p>
              <p>
                <strong className="text-[#18201c]">Grievance Officer:</strong> Swati Chauhan (
                <span className="text-[#5e720d]">grievance@crave.app</span>)
              </p>
              <p>
                <strong className="text-[#18201c]">Nodal Officer:</strong> Ashwat Kumar (
                <span className="text-[#5e720d]">nodal@crave.app</span>)
              </p>
            </div>
          </section>
        </div>

        {/* IN-PAGE STICKY TABLE OF CONTENTS SIDEBAR (RIGHT COLUMN) */}
        <div className="hidden xl:block xl:col-span-1">
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 sticky top-24 max-h-[80vh] overflow-y-auto">
            <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-gray-500 mb-3 px-2">
              On this page
            </h4>
            <nav className="flex flex-col gap-1 text-xs">
              {SECTIONS.map((sec) => (
                <a
                  key={sec.id}
                  href={`#${sec.id}`}
                  className="px-2.5 py-1.5 rounded-lg text-gray-600 hover:text-[#18201c] hover:bg-gray-200/60 font-medium transition truncate"
                >
                  {sec.title}
                </a>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </PolicyLayout>
  )
}
