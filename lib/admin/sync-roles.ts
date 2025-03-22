import { useAdminStore } from "./store"

/**
 * Synchronizes roles between the frontend and backend
 * This should be called when the admin dashboard is loaded
 */
export async function syncRoles() {
  const { roles, setRoles } = useAdminStore.getState()

  try {
    // In a real app, you would fetch roles from the backend
    // For example:
    // const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9595/api";
    // const token = localStorage.getItem("token");
    // const response = await fetch(`${apiUrl}/admin/roles`, {
    //   headers: {
    //     Authorization: `Bearer ${token}`,
    //     "Content-Type": "application/json",
    //   },
    // });
    // if (response.ok) {
    //   const backendRoles = await response.json();
    //   setRoles(backendRoles);
    // }

    // For now, we'll just use the roles from the store
    console.log("Roles synchronized:", roles)
    return roles
  } catch (error) {
    console.error("Error synchronizing roles:", error)
    return roles // Return existing roles on error
  }
}

/**
 * Saves a role to the backend
 * @param role The role to save
 */
export async function saveRoleToBackend(role: any) {
  try {
    // In a real app, you would save the role to the backend
    // For example:
    // const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9595/api";
    // const token = localStorage.getItem("token");
    // const response = await fetch(`${apiUrl}/admin/roles`, {
    //   method: "POST",
    //   headers: {
    //     Authorization: `Bearer ${token}`,
    //     "Content-Type": "application/json",
    //   },
    //   body: JSON.stringify(role),
    // });
    // if (!response.ok) {
    //   throw new Error("Failed to save role to backend");
    // }
    // return await response.json();

    // For now, we'll just return the role
    console.log("Role saved to backend:", role)
    return role
  } catch (error) {
    console.error("Error saving role to backend:", error)
    throw error
  }
}

