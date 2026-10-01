"use client";

import React from "react";
import Link from "next/link";
import {
  Download,
  Smartphone,
  Store,
  Truck,
  Apple,
  ShieldCheck,
  ArrowLeft,
  FileCode,
  HardDrive,
  Cpu,
  Layers,
  CheckCircle2,
  Lock,
} from "lucide-react";

const APP_DOWNLOADS = [
  {
    id: "customer",
    title: "Customer Mobile App",
    tagline: "Order food, groceries & products in your city",
    packageName: "com.delivery.customer",
    icon: Smartphone,
    iconBg: "bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-blue-500/20",
    version: "v1.0.0",
    buildCode: "1000",
    releaseDate: "October 2026",
    androidSize: "8.5 MB",
    iosSize: "8.5 MB",
    minAndroid: "Android 8.0+ (API 26-35)",
    minIos: "iOS 14.0+ (iPhone & iPad)",
    architectures: "arm64-v8a, x86_64, armeabi-v7a",
    engine: "Hermes Bytecode Engine",
    permissions: ["GPS Location", "Camera (QR Scanner)", "Notifications", "Storage"],
    sha256: "fa715dc0c412f36dceb0fed080d34f77cf1133be202913d0097d774db4e487ea",
    accentColor: "border-blue-200 bg-blue-50 text-blue-700",
    btnColor: "bg-blue-600 hover:bg-blue-700 text-white",
    apkUrl: "/apk/customer-v1.0.0.apk",
    ipaUrl: "/apk/customer-v1.0.0.ipa",
    apkFileName: "customer-v1.0.0.apk",
    ipaFileName: "customer-v1.0.0.ipa",
  },
  {
    id: "vendor",
    title: "Vendor Store App",
    tagline: "Manage inventory, incoming orders & store earnings",
    packageName: "com.delivery.vendor",
    icon: Store,
    iconBg: "bg-gradient-to-tr from-purple-600 to-pink-600 text-white shadow-purple-500/20",
    version: "v1.0.0",
    buildCode: "1000",
    releaseDate: "October 2026",
    androidSize: "8.6 MB",
    iosSize: "8.6 MB",
    minAndroid: "Android 8.0+ (API 26-35)",
    minIos: "iOS 14.0+ (iPhone & iPad)",
    architectures: "arm64-v8a, x86_64, armeabi-v7a",
    engine: "Hermes Bytecode Engine",
    permissions: ["Camera (Inventory & QR)", "Notifications", "Storage Access"],
    sha256: "0132353ebb8d7d9a36707da5fee3aff039e7eb6a88806b576c3a2eb775ab96e8",
    accentColor: "border-purple-200 bg-purple-50 text-purple-700",
    btnColor: "bg-purple-600 hover:bg-purple-700 text-white",
    apkUrl: "/apk/vendor-v1.0.0.apk",
    ipaUrl: "/apk/vendor-v1.0.0.ipa",
    apkFileName: "vendor-v1.0.0.apk",
    ipaFileName: "vendor-v1.0.0.ipa",
  },
  {
    id: "driver",
    title: "Driver Courier App",
    tagline: "Accept delivery dispatches, navigate GPS & get paid",
    packageName: "com.delivery.driver",
    icon: Truck,
    iconBg: "bg-gradient-to-tr from-emerald-600 to-teal-600 text-white shadow-emerald-500/20",
    version: "v1.0.0",
    buildCode: "1000",
    releaseDate: "October 2026",
    androidSize: "8.5 MB",
    iosSize: "8.5 MB",
    minAndroid: "Android 8.0+ (API 26-35)",
    minIos: "iOS 14.0+ (iPhone & iPad)",
    architectures: "arm64-v8a, x86_64, armeabi-v7a",
    engine: "Hermes Bytecode Engine",
    permissions: ["Background Location", "Foreground Service", "Camera (QR)", "Vibrate"],
    sha256: "5db3df899a22a126dd67041999f8ebe8d0e76500ed81cd57b600d8c1d61afa40",
    accentColor: "border-emerald-200 bg-emerald-50 text-emerald-700",
    btnColor: "bg-emerald-600 hover:bg-emerald-700 text-white",
    apkUrl: "/apk/driver-v1.0.0.apk",
    ipaUrl: "/apk/driver-v1.0.0.ipa",
    apkFileName: "driver-v1.0.0.apk",
    ipaFileName: "driver-v1.0.0.ipa",
  },
];

export default function PublicDownloadsPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20 selection:bg-blue-600 selection:text-white">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Home</span>
          </Link>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
              D
            </div>
            <span className="font-bold text-sm text-slate-900">App Download Portal</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 pt-12 space-y-10">
        {/* Banner */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-blue-200 bg-blue-50 text-blue-700 text-xs font-semibold">
            <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
            <span>Official Build Packages (6 Builds Available)</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Download Mobile Applications
          </h1>
          <p className="text-slate-600 text-sm font-normal">
            Calculated build specifications, exact package sizes, OS compatibility, and verified
            download links for 3 Android APKs and 3 iOS IPAs.
          </p>
        </div>

        {/* App Cards List */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {APP_DOWNLOADS.map((app) => {
            const Icon = app.icon;
            return (
              <div
                key={app.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5 flex flex-col justify-between hover:border-slate-300 hover:shadow-md transition-all"
              >
                <div className="space-y-4">
                  {/* APP LOGO ICON & NAME HEADER */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-2xl ${app.iconBg} flex items-center justify-center flex-shrink-0 shadow-md ring-4 ring-slate-100`}
                      >
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 leading-tight">
                          {app.title}
                        </h3>
                        <span className="text-[11px] font-mono text-slate-500 block mt-0.5">
                          {app.packageName}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${app.accentColor}`}
                    >
                      {app.version}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed font-normal">
                    {app.tagline}
                  </p>

                  {/* CALCULATED SPECS & COMPATIBILITY METRICS */}
                  <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4 space-y-2.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                        <HardDrive className="h-3.5 w-3.5 text-blue-600" />
                        Android APK ({app.apkFileName}):
                      </span>
                      <span className="font-bold text-slate-900">{app.androidSize}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                        <Apple className="h-3.5 w-3.5 text-purple-600" />
                        iOS IPA ({app.ipaFileName}):
                      </span>
                      <span className="font-bold text-slate-900">{app.iosSize}</span>
                    </div>

                    <div className="flex justify-between items-center border-t border-slate-200/60 pt-2">
                      <span className="text-slate-500 font-medium">Android Min SDK:</span>
                      <span className="font-semibold text-slate-800">{app.minAndroid}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-medium">iOS Compatibility:</span>
                      <span className="font-semibold text-slate-800">{app.minIos}</span>
                    </div>

                    <div className="flex justify-between items-center border-t border-slate-200/60 pt-2">
                      <span className="text-slate-500 flex items-center gap-1 font-medium">
                        <Cpu className="h-3.5 w-3.5 text-slate-400" />
                        Architecture:
                      </span>
                      <span className="font-mono text-[10px] text-slate-700 truncate max-w-[140px]">
                        {app.architectures}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 flex items-center gap-1 font-medium">
                        <Layers className="h-3.5 w-3.5 text-slate-400" />
                        Runtime Engine:
                      </span>
                      <span className="font-medium text-slate-800">{app.engine}</span>
                    </div>
                  </div>

                  {/* PERMISSIONS REQUIRED */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Lock className="h-3 w-3 text-slate-400" />
                      Required Permissions
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {app.permissions.map((perm) => (
                        <span
                          key={perm}
                          className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200"
                        >
                          <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" />
                          {perm}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* SHA-256 CHECKSUM */}
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <FileCode className="h-3 w-3 text-slate-400" />
                      SHA-256 Checksum
                    </p>
                    <p className="text-[10px] font-mono text-slate-600 truncate bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200 select-all">
                      {app.sha256}
                    </p>
                  </div>
                </div>

                {/* DOWNLOAD ACTIONS FOR ALL 6 BUILDS (3 ANDROID APKs + 3 iOS IPAs) */}
                <div className="space-y-2 pt-3 border-t border-slate-100">
                  <a
                    href={app.apkUrl}
                    download={app.apkFileName}
                    className={`w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-xs shadow-sm transition-colors cursor-pointer ${app.btnColor}`}
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download Android APK ({app.apkFileName})</span>
                  </a>

                  <a
                    href={app.ipaUrl}
                    download={app.ipaFileName}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                  >
                    <Apple className="h-3.5 w-3.5 text-slate-900" />
                    <span>Download iOS Package ({app.ipaFileName})</span>
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
