"use client"

import { useState, useEffect } from "react"
import { RefreshCw } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAdminStore } from "@/lib/admin/store"
import { updateUser } from "@/lib/admin/api"

interface EditUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: any
}

export function EditUserDialog({ open, onOpenChange, user }: EditUserDialogProps) {
  const { users, setUsers, isProcessing, setIsProcessing, setNotification, addRoleIfNotExists } = useAdminStore()
  const [editedUser, setEditedUser] = useState({
    username: user.username,
    email: user.email,
    role: user.role,
    is_active: user.is_active,
  })

  // Get the latest roles from the store
  const { roles } = useAdminStore()

  // Ensure the user's current role exists in our roles list
  useEffect(() => {
    if (user.role) {
      addRoleIfNotExists(user.role)
    }
  }, [user.role, addRoleIfNotExists])

  const handleSaveChanges = async () => {
    setIsProcessing(true)
    try {
      // Make sure the role exists in our store
      addRoleIfNotExists(editedUser.role)

      const updatedUser = await updateUser(user.id, editedUser)

      // Update users list
      setUsers(users.map((u) => (u.id === updatedUser.id ? updatedUser : u)))

      setNotification({
        type: "success",
        message: `User ${updatedUser.username} updated successfully`,
      })

      // Close dialog
      onOpenChange(false)

      // Clear notification after 3 seconds
      setTimeout(() => setNotification(null), 3000)
    } catch (error) {
      console.error("Error updating user:", error)
      setNotification({
        type: "error",
        message: error.message || "Failed to update user",
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
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={editedUser.username}
              onChange={(e) => setEditedUser({ ...editedUser, username: e.target.value })}
              className="bg-background border-input text-foreground"
              disabled={user.username === "admin"}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={editedUser.email}
              onChange={(e) => setEditedUser({ ...editedUser, email: e.target.value })}
              className="bg-background border-input text-foreground"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select
              value={editedUser.role}
              onValueChange={(value) => setEditedUser({ ...editedUser, role: value })}
              disabled={user.username === "admin"}
            >
              <SelectTrigger className="bg-background border-input text-foreground">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border text-popover-foreground">
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.name}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={editedUser.is_active}
              onCheckedChange={(checked) => setEditedUser({ ...editedUser, is_active: checked })}
              disabled={user.username === "admin"}
            />
            <Label htmlFor="is_active">Active</Label>
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

