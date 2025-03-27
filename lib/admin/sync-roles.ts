import { useAdminStore } from "./store"
import { Role } from "./store"

/**
 * Synchronizes roles between the frontend and backend
 * This should be called when the admin dashboard is loaded
 */
export async function syncRoles() {
  try {
    const getApiUrl = () => {
      if (process.env.NEXT_PUBLIC_API_URL) {
        return process.env.NEXT_PUBLIC_API_URL
      }
      return "http://localhost:9595/api"
    }

    const apiUrl = getApiUrl()
    const token = localStorage.getItem("token")
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    }

    // Fetch roles from the backend
    const response = await fetch(`${apiUrl}/admin/roles`, { headers })

    if (!response.ok) {
      throw new Error(`Failed to fetch roles: ${response.statusText}`)
    }

    const rolesData = await response.json()
    console.log("Fetched roles from backend:", rolesData)

    // Update the store with the fetched roles
    const { setRoles } = useAdminStore.getState()

    // Transform the roles data if needed to match the expected format
    const formattedRoles = rolesData.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description || "",
      permissions: role.permissions_list || [], // Use permissions_list which is the alias for permissions in the backend
      is_system_role: role.is_system_role || false,
      created_at: role.created_at,
      updated_at: role.updated_at
    }))

    setRoles(formattedRoles)

    // Also fetch available permissions
    await syncAvailablePermissions()

    return formattedRoles
  } catch (error) {
    console.error("Error syncing roles:", error)

    // If the API call fails, use default roles
    const { setRoles } = useAdminStore.getState()
    const defaultRoles = [
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
    ]

    setRoles(defaultRoles)
    return defaultRoles
  }
}

/**
 * Synchronizes available permissions from the backend
 */
export async function syncAvailablePermissions() {
  try {
    const getApiUrl = () => {
      if (process.env.NEXT_PUBLIC_API_URL) {
        return process.env.NEXT_PUBLIC_API_URL
      }
      return "http://localhost:9595/api"
    }

    const apiUrl = getApiUrl()
    const token = localStorage.getItem("token")
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    }

    // Fetch available permissions from the backend
    // Update the URL to use the correct endpoint
    const response = await fetch(`${apiUrl}/admin/permissions`, { headers })

    if (!response.ok) {
      throw new Error(`Failed to fetch permissions: ${response.statusText}`)
    }

    const permissionsData = await response.json()
    console.log("Fetched permissions from backend:", permissionsData)

    // Update the store with the fetched permissions
    const { setAvailablePermissions } = useAdminStore.getState()
    setAvailablePermissions(permissionsData)

    return permissionsData
  } catch (error) {
    console.error("Error syncing permissions:", error)
    return []
  }
}

/**
 * Saves a role to the backend
 * @param role The role to save
 * @returns The saved role
 */
export async function saveRoleToBackend(role: Role) {
  try {
    const getApiUrl = () => {
      if (process.env.NEXT_PUBLIC_API_URL) {
        return process.env.NEXT_PUBLIC_API_URL
      }
      return "http://localhost:9595/api"
    }

    const apiUrl = getApiUrl()
    const token = localStorage.getItem("token")
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    }

    const isNewRole = !role.id
    // Update the URL to use the correct endpoint
    const url = isNewRole ? `${apiUrl}/admin/roles` : `${apiUrl}/admin/roles/${role.id}`
    const method = isNewRole ? "POST" : "PUT"

    console.log(`Saving role to backend: ${JSON.stringify(role)}`)

    const response = await fetch(url, {
      method,
      headers,
      body: JSON.stringify(role),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to save role: ${response.statusText} - ${errorText}`)
    }

    const savedRole = await response.json()
    console.log(`Role saved successfully: ${JSON.stringify(savedRole)}`)

    return savedRole
  } catch (error) {
    console.error("Error saving role:", error)
    throw error
  }
}
