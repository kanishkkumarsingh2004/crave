import type { Metadata } from "next";
import Link from "next/link";
import {
  Smartphone,
  Download,
  ShieldCheck,
  Zap,
  ArrowRight,
  CheckCircle2,
  HardDrive,
  Apple,
  Cpu,
  Layers,
  Lock,
  FileCode,
  MapPin,
  CreditCard,
  KeyRound,
  ShoppingBag,
  Sparkles,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Blinkbite — Customer Mobile App | Instant Hyperlocal Delivery",
  description:
    "Official single-page portal for the Blinkbite Customer Mobile App (v1.0.0). Download Android APK and iOS packages with live GPS tracking and standard NPCI UPI checkout.",
};

const CUSTOMER_APP_SPECS = {
  title: "Blinkbite Customer Mobile App",
  packageName: "com.delivery.customer",
  version: "v1.0.0",
  buildCode: "1000",
  releaseDate: "October 2026",
  androidSize: "8.5 MB",
  iosSize: "8.5 MB",
  minAndroid: "Android 8.0+ (API 26-35)",
  minIos: "iOS 14.0+ (iPhone & iPad)",
  architectures: "arm64-v8a, x86_64, armeabi-v7a",
  engine: "Hermes Bytecode Engine",
  permissions: ["GPS Fine Location", "Camera (QR Scanner)", "Push Notifications", "Storage"],
  sha256: "fa715dc0c412f36dceb0fed080d34f77cf1133be202913d0097d774db4e487ea",
  apkUrl: "/apk/customer-v1.0.0.apk",
  ipaUrl: "/apk/customer-v1.0.0.ipa",
  apkFileName: "customer-v1.0.0.apk",
  ipaFileName: "customer-v1.0.0.ipa",
};

export default function SingleCustomerAppHomePage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-600 selection:text-white">
      {/* 1. Header Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-extrabold text-lg shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              B
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-slate-900 block leading-none">
                Blinkbite
              </span>
              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-500 uppercase tracking-widest flex items-center gap-1 mt-0.5">
                <span>Customer Mobile App</span>
                <span className="h-1 w-1 rounded-full bg-blue-600" />
                <span className="text-slate-400">v1.0.0</span>
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <a href="#features" className="hover:text-blue-600 transition-colors">
              App Features
            </a>
            <a href="#download" className="hover:text-blue-600 transition-colors">
              Download Package
            </a>
            <a href="#specs" className="hover:text-blue-600 transition-colors">
              Build Specs
            </a>
            <a href="#security" className="hover:text-blue-600 transition-colors">
              System Metrics
            </a>
          </nav>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="pt-16 pb-20 px-6 max-w-5xl mx-auto text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-200 bg-blue-50/80 text-blue-700 text-xs font-bold shadow-sm">
          <Zap className="h-3.5 w-3.5 text-blue-600" />
          <span>Blinkbite Hyperlocal Platform • Customer Mobile Application</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-slate-900 leading-tight">
          Lightning-fast delivery <br className="hidden sm:inline" />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600">
            for groceries & food in your city
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto font-normal leading-relaxed">
          Order from local store vendors with live GPS map courier tracking, standard NPCI UPI
          auto-redirect payments, and secure 4-digit OTP delivery handoffs.
        </p>

        {/* Dual Primary Download CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <a
            href={CUSTOMER_APP_SPECS.apkUrl}
            download={CUSTOMER_APP_SPECS.apkFileName}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-7 py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm transition-all shadow-lg shadow-blue-500/25 active:scale-[0.98]"
          >
            <Download className="h-5 w-5" />
            <div className="text-left">
              <span className="block text-[10px] uppercase tracking-wider font-semibold opacity-90">
                Android Package
              </span>
              <span className="text-sm">Download APK ({CUSTOMER_APP_SPECS.androidSize})</span>
            </div>
          </a>

          <a
            href={CUSTOMER_APP_SPECS.ipaUrl}
            download={CUSTOMER_APP_SPECS.ipaFileName}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-7 py-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-extrabold text-sm border border-slate-300 transition-all shadow-sm active:scale-[0.98]"
          >
            <Apple className="h-5 w-5 text-slate-900" />
            <div className="text-left">
              <span className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500">
                iOS Package
              </span>
              <span className="text-sm">Download IPA ({CUSTOMER_APP_SPECS.iosSize})</span>
            </div>
          </a>
        </div>
      </section>

      {/* 3. Customer App Feature Grid */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-12 space-y-10">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Customer App Features
          </h2>
          <p className="text-sm text-slate-500 max-w-xl mx-auto">
            Everything you need for seamless hyperlocal grocery and food ordering in one intuitive app.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Feature 1 */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 hover:border-blue-300 hover:shadow-lg transition-all">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Instant Local Store Shopping</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Explore nearby grocery stores, restaurants, and vendors with real-time stock and prices.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 hover:border-blue-300 hover:shadow-lg transition-all">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm">
              <MapPin className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Live GPS Courier Tracking</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Track your delivery driver live on the interactive map from vendor pickup to your doorstep.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 hover:border-blue-300 hover:shadow-lg transition-all">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm">
              <CreditCard className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">NPCI Standard UPI Checkout</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Pay using Google Pay, PhonePe, Paytm, BHIM, or Amazon Pay with instant 12-digit UTR validation.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 hover:border-blue-300 hover:shadow-lg transition-all">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shadow-sm">
              <KeyRound className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">4-Digit Secure Delivery OTP</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Ensure package security with a single-use 4-digit verification PIN handed directly to the courier.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Direct App Package Download Section */}
      <section id="download" className="max-w-6xl mx-auto px-6 py-12">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-8 sm:p-12 space-y-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-slate-100">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/25 shrink-0 ring-4 ring-blue-100">
                <Smartphone className="h-8 w-8" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-black text-slate-900">{CUSTOMER_APP_SPECS.title}</h2>
                  <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full border border-blue-200 bg-blue-50 text-blue-700">
                    {CUSTOMER_APP_SPECS.version}
                  </span>
                </div>
                <p className="text-xs font-mono text-slate-500 mt-1">
                  Package Name: {CUSTOMER_APP_SPECS.packageName}
                </p>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Verified Release Package</span>
            </div>
          </div>

          {/* Download Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <HardDrive className="h-4 w-4 text-blue-600" /> Android Installation
                </span>
                <span className="text-xs font-extrabold text-slate-900">{CUSTOMER_APP_SPECS.androidSize}</span>
              </div>
              <p className="text-xs text-slate-500">
                Standalone APK package for Android devices (API Level 26+).
              </p>
              <a
                href={CUSTOMER_APP_SPECS.apkUrl}
                download={CUSTOMER_APP_SPECS.apkFileName}
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs transition-colors shadow-md shadow-blue-500/20"
              >
                <Download className="h-4 w-4" />
                <span>Download {CUSTOMER_APP_SPECS.apkFileName}</span>
              </a>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Apple className="h-4 w-4 text-purple-600" /> iOS Installation
                </span>
                <span className="text-xs font-extrabold text-slate-900">{CUSTOMER_APP_SPECS.iosSize}</span>
              </div>
              <p className="text-xs text-slate-500">
                iOS application archive for iPhones and iPads (iOS 14.0+).
              </p>
              <a
                href={CUSTOMER_APP_SPECS.ipaUrl}
                download={CUSTOMER_APP_SPECS.ipaFileName}
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-900 font-extrabold text-xs transition-colors shadow-sm"
              >
                <Apple className="h-4 w-4 text-slate-900" />
                <span>Download {CUSTOMER_APP_SPECS.ipaFileName}</span>
              </a>
            </div>
          </div>

          {/* Quick Installation Guide */}
          <div className="p-5 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-3">
            <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-blue-600" /> Quick Installation Steps
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-700">
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                  1
                </span>
                <span>Download the APK or IPA file above to your mobile device.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                  2
                </span>
                <span>Tap the file to install (allow &apos;Install from unknown sources&apos; if requested).</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                  3
                </span>
                <span>Open Blinkbite, grant location permissions, and enjoy instant ordering!</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Complete Technical Specifications Grid */}
      <section id="specs" className="max-w-6xl mx-auto px-6 py-12 space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Technical Build Specifications</h2>
          <p className="text-sm text-slate-500">
            Calculated build package metrics, target runtime environments, and permissions.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Application Identifier:</span>
                <span className="font-mono font-bold text-slate-900">{CUSTOMER_APP_SPECS.packageName}</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Version & Build Code:</span>
                <span className="font-semibold text-slate-800">
                  {CUSTOMER_APP_SPECS.version} (Build #{CUSTOMER_APP_SPECS.buildCode})
                </span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Android Min SDK:</span>
                <span className="font-semibold text-slate-800">{CUSTOMER_APP_SPECS.minAndroid}</span>
              </div>

              <div className="flex justify-between items-center py-2">
                <span className="text-slate-500 font-medium">iOS Min Version:</span>
                <span className="font-semibold text-slate-800">{CUSTOMER_APP_SPECS.minIos}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                  <Cpu className="h-3.5 w-3.5 text-blue-600" /> Architectures:
                </span>
                <span className="font-mono text-slate-800">{CUSTOMER_APP_SPECS.architectures}</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                  <Layers className="h-3.5 w-3.5 text-indigo-600" /> Runtime Engine:
                </span>
                <span className="font-semibold text-slate-800">{CUSTOMER_APP_SPECS.engine}</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Package Size:</span>
                <span className="font-bold text-slate-900">{CUSTOMER_APP_SPECS.androidSize}</span>
              </div>

              <div className="flex justify-between items-center py-2">
                <span className="text-slate-500 font-medium">Release Date:</span>
                <span className="font-semibold text-slate-800">{CUSTOMER_APP_SPECS.releaseDate}</span>
              </div>
            </div>
          </div>

          {/* Permissions List */}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-slate-400" /> Required Device Permissions
            </p>
            <div className="flex flex-wrap gap-2">
              {CUSTOMER_APP_SPECS.permissions.map((perm) => (
                <span
                  key={perm}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  {perm}
                </span>
              ))}
            </div>
          </div>

          {/* SHA-256 Checksum */}
          <div className="pt-2 space-y-1.5">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <FileCode className="h-3.5 w-3.5 text-slate-400" /> SHA-256 Package Checksum
            </p>
            <p className="text-xs font-mono text-slate-600 truncate bg-slate-50 p-3 rounded-xl border border-slate-200 select-all">
              {CUSTOMER_APP_SPECS.sha256}
            </p>
          </div>
        </div>
      </section>

      {/* 6. System Uptime & Trust Metrics Bar */}
      <section id="security" className="border-y border-slate-200 bg-white py-12">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div>
            <div className="text-3xl font-black text-slate-900">&lt; 15 Mins</div>
            <div className="text-xs font-semibold text-slate-500 mt-1">Average Delivery Time</div>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900">100% Verified</div>
            <div className="text-xs font-semibold text-slate-500 mt-1">Standard NPCI UPI</div>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900">4-Digit PIN</div>
            <div className="text-xs font-semibold text-slate-500 mt-1">Delivery OTP Handoff</div>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900">99.9%</div>
            <div className="text-xs font-semibold text-slate-500 mt-1">System Uptime</div>
          </div>
        </div>
      </section>

      {/* 7. Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 px-6 text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">
              B
            </div>
            <span className="text-slate-700 font-bold">Blinkbite Customer App © 2026</span>
          </div>

          <div className="flex items-center gap-6 font-semibold">
            <a href="#download" className="hover:text-blue-600 transition-colors">
              App Download
            </a>
            <a href="#features" className="hover:text-blue-600 transition-colors">
              Features
            </a>
            <a href="#specs" className="hover:text-blue-600 transition-colors">
              Technical Specs
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
