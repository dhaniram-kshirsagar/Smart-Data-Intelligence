"use client"

import { useState } from "react"
import { RefreshCw } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useAdminStore } from "@/lib/admin/store"

interface EditRoleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  role: any
}

export function EditRoleDialog({ open, onOpenChange, role }: EditRoleDialogProps) {
  const { roles, setRoles, availablePermissions, isProcessing, setIsProcessing, setNotification } = useAdminStore()
  const [editedRole, setEditedRole] = useState({
    id: role.id,
    name: role.name,
    description: role.description,
    permissions: [...role.permissions],
  })

  const togglePermission = (permission: string) => {
    setEditedRole((prev) => {
      const permissions = prev.permissions.includes(permission)
        ? prev.permissions.filter((p) => p !== permission)
        : [...prev.permissions, permission]
      return { ...prev, permissions }
    })
  }

  const handleSaveChanges = async () => {
    if (!editedRole.name) {
      setNotification({
        type: "error",
        message: "Role name is required",
      })
      return
    }

    setIsProcessing(true)
    try {
      // In a real app, this would call your API
      // Here we're just updating the state directly
      const updatedRoles = roles.map((r) => (r.id === editedRole.id ? editedRole : r))

      // Update the roles in the store
      setRoles(updatedRoles)

      setNotification({
        type: "success",
        message: `Role "${editedRole.name}" updated successfully`,
      })

      // Close dialog
      onOpenChange(false)

      // Clear notification after 3 seconds
      setTimeout(() => setNotification(null), 3000)
    } catch (error) {
      console.error("Error updating role:", error)
      setNotification({
        type: "error",
        message: "Failed to update role",
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
              className="bg-background border-input text-foreground"
              disabled={editedRole.name === "admin" || editedRole.name === "researcher" || editedRole.name === "user"}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={editedRole.description}
              onChange={(e) => setEditedRole({ ...editedRole, description: e.target.value })}
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
                    checked={editedRole.permissions.includes(permission.id)}
                    onCheckedChange={() => togglePermission(permission.id)}
                    disabled={editedRole.name === "admin" && permission.id === "user_management"}
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
            onClick={handleSaveChanges}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <RefreshCw className="h-3 w-3 mr-1 animate-spin text-white" />
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

