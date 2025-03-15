import LoadingSpinner from "@/components/loading-spinner"
import { DashboardTab } from "@/components/admin/tabs/dashboard-tab"
import { UsersTab } from "@/components/admin/tabs/users-tab"
import { ActivityTab } from "@/components/admin/tabs/activity-tab"
import { PermissionsTab } from "@/components/admin/tabs/permissions-tab"
import { SettingsTab } from "@/components/admin/tabs/settings-tab"

interface AdminTabsProps {
  activeTab: string
  loading: boolean
  error: string | null
}

export function AdminTabs({ activeTab, loading, error }: AdminTabsProps) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <>
      {error && (
        <div className="bg-yellow-500/20 border border-yellow-500 text-yellow-700 dark:text-yellow-200 px-4 py-2 rounded-md mb-4">
          <p>{error}</p>
        </div>
      )}

      {activeTab === "dashboard" && <DashboardTab />}
      {activeTab === "users" && <UsersTab />}
      {activeTab === "activity" && <ActivityTab />}
      {activeTab === "permissions" && <PermissionsTab />}
      {activeTab === "settings" && <SettingsTab />}
    </>
  )
}

