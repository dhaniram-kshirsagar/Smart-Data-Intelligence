"use client"

import { useState, useEffect } from "react"
import { RefreshCw } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useAdminStore } from "@/lib/admin/store"
import { saveRoleToBackend } from "@/lib/admin/sync-roles"

interface EditRoleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  role: any
}

export function EditRoleDialog({ open, onOpenChange, role }: EditRoleDialogProps) {
  const { roles, setRoles, availablePermissions, isProcessing, setIsProcessing, setNotification } = useAdminStore()
  const [editedRole, setEditedRole] = useState<{
    id: number;
    name: string;
    description: string;
    permissions: string[];
    is_system_role: boolean;
  }>({
    id: role?.id || 0,
    name: role?.name || "",
    description: role?.description || "",
    permissions: role?.permissions || [],
    is_system_role: role?.is_system_role || false
  })

  // Update the edited role when the role prop changes
  useEffect(() => {
    if (role) {
      // Debug log to help troubleshoot
      console.log("Role data received in EditRoleDialog:", role);
      
      // Ensure we have the permissions data, checking all possible sources
      let permissions: string[] = [];
      if (Array.isArray(role.permissions) && role.permissions.length > 0) {
        permissions = role.permissions;
      } else if (Array.isArray(role.permissions_list) && role.permissions_list.length > 0) {
        permissions = role.permissions_list;
      }
      
      console.log("Permissions set in EditRoleDialog:", permissions);
      
      setEditedRole({
        id: role.id || 0,
        name: role.name || "",
        description: role.description || "",
        permissions: permissions,
        is_system_role: role.is_system_role || false
      });
    }
  }, [role])

  const togglePermission = (permission: string) => {
    setEditedRole((prev) => {
      const updatedPermissions = prev.permissions.includes(permission)
        ? prev.permissions.filter((p) => p !== permission)
        : [...prev.permissions, permission];
      
      return { 
        ...prev, 
        permissions: updatedPermissions 
      };
    });
  }

  const handleSaveChanges = async () => {
    if (!editedRole.name) {
      setNotification({
        type: "error",
        message: "Role name is required",
      })
      return
    }

    // Check if the role is a system role
    if (editedRole.is_system_role) {
      setNotification({
        type: "error",
        message: "System roles cannot be modified",
      })
      return
    }

    // Check if the new name already exists (but ignore the current role)
    const roleExists = roles.some((r) => r.id !== role.id && r.name.toLowerCase() === editedRole.name.toLowerCase())
    if (roleExists) {
      setNotification({
        type: "error",
        message: `Role "${editedRole.name}" already exists`,
      })
      return
    }

    setIsProcessing(true)
    try {
      // Save the role to the backend
      const savedRole = await saveRoleToBackend({
        id: role.id,
        name: editedRole.name,
        description: editedRole.description,
        permissions: editedRole.permissions,
      })
      
      console.log("Role saved successfully:", savedRole);

      // Update the role in the store
      const updatedRoles = roles.map(r => 
        r.id === savedRole.id ? {
          ...savedRole,
          // Ensure permissions is properly set from the backend response
          permissions: savedRole.permissions_list || savedRole.permissions || []
        } : r
      );
      setRoles(updatedRoles);

      setNotification({
        type: "success",
        message: `Role "${editedRole.name}" updated successfully`,
      })

      // Close dialog
      onOpenChange(false)

      // Clear notification after 3 seconds
      setTimeout(() => setNotification(null), 3000)
    } catch (error: any) {
      console.error("Error updating role:", error)
      setNotification({
        type: "error",
        message: error.message || "Failed to update role",
      })

      // Clear notification after 3 seconds
      setTimeout(() => setNotification(null), 3000)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border border-border text-card-foreground">
        <DialogHeader>
          <DialogTitle>Edit Role</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Role Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={editedRole.name}
              onChange={(e) => setEditedRole({ ...editedRole, name: e.target.value })}
              placeholder="Enter role name"
              disabled={editedRole.is_system_role}
            />
            {editedRole.is_system_role && (
              <p className="text-xs text-muted-foreground">System roles cannot be modified</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={editedRole.description}
              onChange={(e) => setEditedRole({ ...editedRole, description: e.target.value })}
              placeholder="Enter role description"
              disabled={editedRole.is_system_role}
            />
          </div>
          <div className="space-y-2">
            <Label>Permissions</Label>
            <div className="space-y-2 border border-border rounded-md p-4 max-h-48 overflow-y-auto">
              {availablePermissions.map((permission) => (
                <div key={permission} className="flex items-center space-x-2">
                  <Checkbox
                    id={`permission-edit-${permission}`}
                    checked={editedRole.permissions.includes(permission)}
                    onCheckedChange={() => togglePermission(permission)}
                    disabled={editedRole.is_system_role}
                  />
                  <Label htmlFor={`permission-edit-${permission}`} className="font-normal cursor-pointer">
                    {permission}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSaveChanges} 
            disabled={isProcessing || editedRole.is_system_role}
          >
            {isProcessing ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
