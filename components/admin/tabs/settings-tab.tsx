"use client"

import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useAdminStore } from "@/lib/admin/store"
import { updateSystemSetting, runBackup, exportData, cleanupData } from "@/lib/admin/api"

export function SettingsTab() {
  const { systemSettings, setSystemSettings, isProcessing, setIsProcessing, setNotification } = useAdminStore()

  const handleUpdateSetting = async (setting, value) => {
    setIsProcessing(true)
    try {
      const updatedSettings = await updateSystemSetting(setting, value)
      setSystemSettings(updatedSettings)
      setNotification({
        type: "success",
        message: `${setting.replace(/_/g, " ")} has been ${value ? "enabled" : "disabled"}`,
      })

      // Clear notification after 3 seconds
      setTimeout(() => setNotification(null), 3000)
    } catch (error) {
      console.error("Error updating setting:", error)
      setNotification({
        type: "error",
        message: "Failed to update setting",
      })

      // Clear notification after 3 seconds
      setTimeout(() => setNotification(null), 3000)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRunBackup = async () => {
    setIsProcessing(true)
    try {
      await runBackup()
      setNotification({
        type: "success",
        message: "Backup process started",
      })

      // Refresh data after 3 seconds to get updated backup time
      setTimeout(() => {
        // In a real app, you would fetch updated settings here
        setNotification(null)
      }, 3000)
    } catch (error) {
      console.error("Error starting backup:", error)
      setNotification({
        type: "error",
        message: "Failed to start backup",
      })

      // Clear notification after 3 seconds
      setTimeout(() => setNotification(null), 3000)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleExportData = async () => {
    setIsProcessing(true)
    try {
      await exportData()
      setNotification({
        type: "success",
        message: "Data export initiated",
      })

      // Clear notification after 3 seconds
      setTimeout(() => setNotification(null), 3000)
    } catch (error) {
      console.error("Error exporting data:", error)
      setNotification({
        type: "error",
        message: "Failed to export data",
      })

      // Clear notification after 3 seconds
      setTimeout(() => setNotification(null), 3000)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCleanupData = async () => {
    setIsProcessing(true)
    try {
      await cleanupData()
      setNotification({
        type: "success",
        message: "Data cleanup process started",
      })

      // Clear notification after 3 seconds
      setTimeout(() => setNotification(null), 3000)
    } catch (error) {
      console.error("Error cleaning up data:", error)
      setNotification({
        type: "error",
        message: "Failed to clean up data",
      })

      // Clear notification after 3 seconds
      setTimeout(() => setNotification(null), 3000)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground mb-4">Settings</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card p-6 rounded-lg border border-border">
          <h3 className="text-lg font-medium text-card-foreground mb-4">System Settings</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 border-b border-border">
              <div>
                <h4 className="text-card-foreground font-medium">Maintenance Mode</h4>
                <p className="text-muted-foreground text-xs">Temporarily disable access to the application</p>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="maintenance-mode"
                  checked={systemSettings?.maintenance_mode || false}
                  onCheckedChange={(checked) => handleUpdateSetting("maintenance_mode", checked)}
                  disabled={isProcessing}
                />
                <Label htmlFor="maintenance-mode" className="sr-only">
                  Maintenance Mode
                </Label>
              </div>
            </div>

            <div className="flex justify-between items-center p-3 border-b border-border">
              <div>
                <h4 className="text-card-foreground font-medium">Debug Mode</h4>
                <p className="text-muted-foreground text-xs">Enable detailed error messages and logging</p>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="debug-mode"
                  checked={systemSettings?.debug_mode || false}
                  onCheckedChange={(checked) => handleUpdateSetting("debug_mode", checked)}
                  disabled={isProcessing}
                />
                <Label htmlFor="debug-mode" className="sr-only">
                  Debug Mode
                </Label>
              </div>
            </div>

            <div className="flex justify-between items-center p-3 border-b border-border">
              <div>
                <h4 className="text-card-foreground font-medium">API Rate Limiting</h4>
                <p className="text-muted-foreground text-xs">Limit API requests per user</p>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="api-rate-limiting"
                  checked={systemSettings?.api_rate_limiting || false}
                  onCheckedChange={(checked) => handleUpdateSetting("api_rate_limiting", checked)}
                  disabled={isProcessing}
                />
                <Label htmlFor="api-rate-limiting" className="sr-only">
                  API Rate Limiting
                </Label>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg border border-border">
          <h3 className="text-lg font-medium text-card-foreground mb-4">Data Management</h3>
          <div className="space-y-4">
            <div className="p-3 border-b border-border">
              <h4 className="text-card-foreground font-medium mb-2">Database Backup</h4>
              <p className="text-muted-foreground text-xs mb-3">
                Last backup:{" "}
                {systemSettings?.last_backup ? new Date(systemSettings.last_backup).toLocaleString() : "Never"}
              </p>
              <Button
                className="bg-violet-600 hover:bg-violet-700 text-white btn-glow text-xs py-1 h-8"
                onClick={handleRunBackup}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin text-white" />
                    Running...
                  </>
                ) : (
                  "Run Backup Now"
                )}
              </Button>
            </div>

            <div className="p-3 border-b border-border">
              <h4 className="text-card-foreground font-medium mb-2">Data Export</h4>
              <p className="text-muted-foreground text-xs mb-3">Export system data for backup or migration</p>
              <Button
                className="bg-violet-600 hover:bg-violet-700 text-white btn-glow text-xs py-1 h-8"
                onClick={handleExportData}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin text-white" />
                    Exporting...
                  </>
                ) : (
                  "Export Data"
                )}
              </Button>
            </div>

            <div className="p-3 border-b border-border">
              <h4 className="text-card-foreground font-medium mb-2">Data Cleanup</h4>
              <p className="text-muted-foreground text-xs mb-3">Remove old or unused data from the system</p>
              <Button
                className="bg-violet-600 hover:bg-violet-700 text-white btn-glow text-xs py-1 h-8"
                onClick={handleCleanupData}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin text-white" />
                    Cleaning...
                  </>
                ) : (
                  "Cleanup Data"
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

