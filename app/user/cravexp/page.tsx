'use client'

import CraveXPStore from '@/components/dashboards/CraveXPStore'
import Navbar from '@/components/Navbar'
<<<<<<< HEAD
import { CraveXPSkeleton } from '@/components/ui/CraveSkeleton'
=======
import { CustomerDashboardSkeleton } from '@/components/ui/SkeletonLoaders'
>>>>>>> caed678 (feat: add customer and vendor dashboard pages, layouts, and loading skeletons)
import { useAuth } from '@/lib/auth-context'

export default function UserCraveXPPage() {
  const { isLoading } = useAuth()

<<<<<<< HEAD
  if (isLoading) {
    return <CraveXPSkeleton />
=======
  useEffect(() => {
    if (isLoading) return
    if (!user) {
      router.replace('/login?logout=1')
    }
  }, [user, isLoading, router])

  if (isLoading || !user) {
    return <CustomerDashboardSkeleton />
>>>>>>> caed678 (feat: add customer and vendor dashboard pages, layouts, and loading skeletons)
  }

  return (
    <div className="min-h-screen bg-[#fafbfa] dark:bg-[#0a0f0c] text-[#18201c] dark:text-[#f2f4f2] antialiased selection:bg-[#86a018] selection:text-white transition-colors duration-300">
      <Navbar />
      <CraveXPStore />
    </div>
  )
}
