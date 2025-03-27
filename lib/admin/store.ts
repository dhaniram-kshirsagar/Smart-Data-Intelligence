import { create } from "zustand"

// Define types for roles and permissions
export interface Role {
  id?: number
  name: string
  description: string
  permissions: string[]
  permissions_list?: string[] // Add this property for backend compatibility
  is_system_role?: boolean
  created_at?: string
  updated_at?: string
}

export interface Notification {
  type: "success" | "error"; 
  message: string
}

export interface AdminState {
  loading: boolean
  setLoading: (loading: boolean) => void

  error: string | null
  setError: (error: string | null) => void

  notification: Notification | null
  setNotification: (notification: Notification | null) => void

  stats: any
  setStats: (stats: any) => void

  users: any[]
  setUsers: (users: any[]) => void

  activity: any[]
  setActivity: (activity: any[]) => void

  systemSettings: any
  setSystemSettings: (systemSettings: any) => void

  roles: Role[]
  setRoles: (roles: Role[]) => void

  availablePermissions: string[]
  setAvailablePermissions: (permissions: string[]) => void

  isProcessing: boolean
  setIsProcessing: (isProcessing: boolean) => void

  addRole: (role: Role) => void
  updateRole: (updatedRole: Role) => void
  deleteRole: (roleId: number) => void
  addRoleIfNotExists: (roleName: string, description?: string) => void

  datasets: any[]
  setDatasets: (datasets: any[]) => void

  datasetDetails: any
  setDatasetDetails: (datasetDetails: any) => void

  schemas: any[]
  setSchemas: (schemas: any[]) => void

  schemaDetails: any
  setSchemaDetails: (schemaDetails: any) => void

  ingestions: any[]
  setIngestions: (ingestions: any[]) => void

  ingestionDetails: any
  setIngestionDetails: (ingestionDetails: any) => void

  ingestionLogs: any[]
  setIngestionLogs: (ingestionLogs: any[]) => void

  notifications: any[]
  addNotification: (notification: Notification) => void
  removeNotification: (id: string) => void
}

export const useAdminStore = create<AdminState>((set) => ({
  loading: false,
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
      description: "Administrator with full access",
      permissions: ["data:read", "data:write", "user:read", "user:write", "role:read", "role:write"],
      is_system_role: true
    },
    {
      id: 2,
      name: "user",
      description: "Regular user with limited access",
      permissions: ["data:read"],
      is_system_role: true
    },
    {
      id: 3,
      name: "researcher",
      description: "Researcher with data access",
      permissions: ["data:read", "data:write", "schema:read", "ingestion:read"],
      is_system_role: true
    },
  ],
  setRoles: (roles) => set({ roles }),
  
  addRole: (role) => set((state) => ({ 
    roles: [...state.roles, role] 
  })),
  
  updateRole: (updatedRole) => set((state) => ({ 
    roles: state.roles.map((role) => 
      role.id === updatedRole.id ? updatedRole : role
    ) 
  })),
  
  deleteRole: (roleId) => set((state) => ({ 
    roles: state.roles.filter((role) => role.id !== roleId) 
  })),
  
  addRoleIfNotExists: (roleName, description) => set((state) => {
    const existingRole = state.roles.find((role) => role.name === roleName);
    if (!existingRole) {
      // Calculate new ID safely, handling undefined values
      const maxId = state.roles.length > 0 
        ? Math.max(...state.roles.map((role) => role.id || 0)) 
        : 0;
      
      const newRole = {
        id: maxId + 1,
        name: roleName,
        description: description || '',
        permissions: [],
        is_system_role: false
      };
      return { roles: [...state.roles, newRole] };
    }
    return state;
  }),

  availablePermissions: [
    "data:read",
    "data:write",
    "user:read",
    "user:write",
    "role:read",
    "role:write",
    "schema:read",
    "schema:write",
    "ingestion:read",
    "ingestion:write"
  ],
  setAvailablePermissions: (permissions) => set({ availablePermissions: permissions }),

  isProcessing: false,
  setIsProcessing: (isProcessing) => set({ isProcessing }),

  datasets: [],
  setDatasets: (datasets) => set({ datasets }),

  datasetDetails: null,
  setDatasetDetails: (datasetDetails) => set({ datasetDetails }),

  schemas: [],
  setSchemas: (schemas) => set({ schemas }),

  schemaDetails: null,
  setSchemaDetails: (schemaDetails) => set({ schemaDetails }),

  ingestions: [],
  setIngestions: (ingestions) => set({ ingestions }),

  ingestionDetails: null,
  setIngestionDetails: (ingestionDetails) => set({ ingestionDetails }),

  ingestionLogs: [],
  setIngestionLogs: (ingestionLogs) => set({ ingestionLogs }),

  notifications: [],
  addNotification: (notification) => set((state) => ({
    notifications: [...state.notifications, { ...notification, id: Date.now().toString() }]
  })),
  removeNotification: (id) => set((state) => ({
    notifications: state.notifications.filter((notification) => notification.id !== id)
  })),
}))
