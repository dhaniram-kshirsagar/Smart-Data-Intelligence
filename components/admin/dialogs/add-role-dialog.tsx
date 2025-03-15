"use client"

import { useState } from "react"
import { RefreshCw } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useAdminStore } from "@/lib/admin/store"

interface AddRoleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddRoleDialog({ open, onOpenChange }: AddRoleDialogProps) {
  const { roles, setRoles, availablePermissions, isProcessing, setIsProcessing, setNotification } = useAdminStore()
  const [newRole, setNewRole] = useState({
    name: "",
    description: "",
    permissions: [] as string[],
  })

  const togglePermission = (permission: string) => {
    setNewRole((prev) => {
      const permissions = prev.permissions.includes(permission)
        ? prev.permissions.filter((p) => p !== permission)
        : [...prev.permissions, permission]
      return { ...prev, permissions }
    })
  }

  const handleAddRole = async () => {
    if (!newRole.name) {
      setNotification({
        type: "error",
        message: "Role name is required",
      })
      return
    }

    // Check if role name already exists
    const roleExists = roles.some((role) => role.name.toLowerCase() === newRole.name.toLowerCase())
    if (roleExists) {
      setNotification({
        type: "error",
        message: `Role "${newRole.name}" already exists`,
      })
      return
    }

    setIsProcessing(true)
    try {
      // In a real app, this would call your API
      // Here we're just updating the state directly
      const newRoleWithId = {
        id: roles.length + 1,
        ...newRole,
      }

      // Update the roles in the store
      setRoles([...roles, newRoleWithId])

      // In a real app, you would also save the role to the backend
      // For example:
      // await saveRoleToBackend(newRoleWithId);

      setNotification({
        type: "success",
        message: `Role "${newRole.name}" created successfully`,
      })

      // Close dialog and reset form
      onOpenChange(false)
      setNewRole({
        name: "",
        description: "",
        permissions: [],
      })

      // Clear notification after 3 seconds
      setTimeout(() => setNotification(null), 3000)
    } catch (error) {
      console.error("Error adding role:", error)
      setNotification({
        type: "error",
        message: error.message || "Failed to create role",
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
          <DialogTitle>Add New Role</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Role Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={newRole.name}
              onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
              className="bg-background border-input text-foreground"
              placeholder="e.g., editor"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={newRole.description}
              onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
              className="bg-background border-input text-foreground"
              placeholder="Role description"
            />
          </div>
          <div className="space-y-2">
            <Label>Permissions</Label>
            <div className="space-y-2 border border-border rounded-md p-4 max-h-48 overflow-y-auto">
              {availablePermissions.map((permission) => (
                <div key={permission.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`permission-${permission.id}`}
                    checked={newRole.permissions.includes(permission.id)}
                    onCheckedChange={() => togglePermission(permission.id)}
                  />
                  <Label htmlFor={`permission-${permission.id}`} className="font-normal cursor-pointer">
                    {permission.name}
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
            className="bg-violet-600 hover:bg-violet-700 text-white btn-glow"
            onClick={handleAddRole}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <RefreshCw className="h-3 w-3 mr-1 animate-spin text-white" />
                Creating...
              </>
            ) : (
              "Add Role"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

