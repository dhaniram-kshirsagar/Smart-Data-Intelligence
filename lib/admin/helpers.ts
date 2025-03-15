import { useAdminStore } from "./store"

/**
 * Helper function to get the latest roles from the admin store
 * This is useful when we need to access roles outside of a React component
 */
export function getLatestRoles() {
  return useAdminStore.getState().roles
}

/**
 * Helper function to get a role by name
 */
export function getRoleByName(roleName: string) {
  const roles = useAdminStore.getState().roles
  return roles.find((role) => role.name === roleName)
}

/**
 * Helper function to get a role by ID
 */
export function getRoleById(roleId: number) {
  const roles = useAdminStore.getState().roles
  return roles.find((role) => role.id === roleId)
}

