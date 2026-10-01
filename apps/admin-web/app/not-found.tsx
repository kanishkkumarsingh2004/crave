import Link from "next/link";
import { ArrowLeft, AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-6 shadow-sm">
        <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
          <AlertCircle className="h-7 w-7" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-blue-600">
            404 Error
          </span>
          <h1 className="text-2xl font-extrabold text-slate-900">Page Not Found</h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            The page you are looking for does not exist or has been moved.
          </p>
        </div>

        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-sm w-full"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Home</span>
        </Link>
      </div>
    </div>
  );
}
