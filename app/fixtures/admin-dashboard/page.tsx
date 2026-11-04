'use client'

import { Skeleton } from 'boneyard-js/react'
import Navbar from '@/components/Navbar'
import AdminDashboard from '@/components/dashboards/AdminDashboard'

export default function AdminDashboardFixture() {
  return (
    <div className="min-h-screen bg-[#fafbfa] dark:bg-[#0c120e]">
      <Skeleton name="Navbar" loading={true}>
        <Navbar />
      </Skeleton>
      <Skeleton name="AdminDashboard" loading={true}>
        <AdminDashboard />
      </Skeleton>
    </div>
  )
}