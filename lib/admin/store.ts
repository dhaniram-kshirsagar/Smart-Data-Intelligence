import { create } from "zustand"

interface AdminState {
  loading: boolean
  setLoading: (loading: boolean) => void

  error: string | null
  setError: (error: string | null) => void

  notification: { type: "success" | "error"; message: string } | null
  setNotification: (notification: { type: "success" | "error"; message: string } | null) => void

  stats: any
  setStats: (stats: any) => void

  users: any[]
  setUsers: (users: any[]) => void

  activity: any[]
  setActivity: (activity: any[]) => void

  systemSettings: any
  setSystemSettings: (systemSettings: any) => void

  roles: any[]
  setRoles: (roles: any[]) => void

  availablePermissions: any[]
  setAvailablePermissions: (permissions: any[]) => void

  isProcessing: boolean
  setIsProcessing: (isProcessing: boolean) => void

  // Add a function to add a role if it doesn't exist
  addRoleIfNotExists: (roleName: string, description?: string) => void
}

export const useAdminStore = create<AdminState>((set, get) => ({
  loading: true,
  setLoading: (loading) => set({ loading }),

  error: null,
  setError: (error) => set({ error }),

  notification: null,
  setNotification: (notification) => set({ notification }),

  stats: null,
  setStats: (stats) => set({ stats }),

  users: [],
  setUsers: (users) => set({ users }),

  activity: [],
  setActivity: (activity) => set({ activity }),

  systemSettings: null,
  setSystemSettings: (systemSettings) => set({ systemSettings }),

  roles: [
    {
      id: 1,
      name: "admin",
      description: "Full access to all system features and settings.",
      permissions: ["user_management", "system_settings", "data_management", "activity_logs"],
    },
    {
      id: 2,
      name: "researcher",
      description: "Access to research tools and data analysis features.",
      permissions: ["datapuur", "kginsights", "data_management"],
    },
    {
      id: 3,
      name: "user",
      description: "Basic access to application features.",
      permissions: ["view_reports", "personal_settings"],
    },
    // Add the "view" role explicitly
    {
      id: 4,
      name: "view",
      description: "View-only access to application features.",
      permissions: ["view_reports"],
    },
  ],
  setRoles: (roles) => set({ roles }),

  availablePermissions: [
    { id: "user_management", name: "User Management" },
    { id: "system_settings", name: "System Settings" },
    { id: "data_management", name: "Data Management" },
    { id: "activity_logs", name: "Activity Logs" },
    { id: "datapuur", name: "DataPuur Access" },
    { id: "kginsights", name: "KGInsights Access" },
    { id: "view_reports", name: "View Reports" },
    { id: "personal_settings", name: "Personal Settings" },
  ],
  setAvailablePermissions: (permissions) => set({ availablePermissions: permissions }),

  isProcessing: false,
  setIsProcessing: (isProcessing) => set({ isProcessing }),

  // Add a function to add a role if it doesn't exist
  addRoleIfNotExists: (roleName, description) => {
    const { roles } = get()

    // Check if role already exists
    if (!roles.some((role) => role.name === roleName)) {
      // Add the role
      const newRole = {
        id: roles.length + 1,
        name: roleName,
        description: description || `Auto-created role: ${roleName}`,
        permissions: ["view_reports"],
      }

      set({ roles: [...roles, newRole] })
      console.log(`Added missing role: ${roleName}`)
    }
  },
}))

