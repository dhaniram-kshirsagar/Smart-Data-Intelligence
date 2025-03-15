"use client"

import { useState } from "react"
import { RefreshCw } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAdminStore } from "@/lib/admin/store"
import { createUser } from "@/lib/admin/api"

interface AddUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddUserDialog({ open, onOpenChange }: AddUserDialogProps) {
  const { users, setUsers, isProcessing, setIsProcessing, setNotification, roles, addRoleIfNotExists } = useAdminStore()
  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    password: "",
    role: "user",
    is_active: true,
  })

  const handleAddUser = async () => {
    if (!newUser.username || !newUser.email || !newUser.password) {
      setNotification({
        type: "error",
        message: "Please fill in all required fields",
      })
      return
    }

    // Make sure the role exists in our store
    addRoleIfNotExists(newUser.role)

    setIsProcessing(true)
    try {
      const addedUser = await createUser(newUser)

      // Ensure created_at is set
      if (!addedUser.created_at) {
        addedUser.created_at = new Date().toISOString()
      }
      // Update users list
      setUsers([...users, addedUser])

      setNotification({
        type: "success",
        message: `User ${addedUser.username} created successfully`,
      })

      // Close dialog and reset form
      onOpenChange(false)
      setNewUser({
        username: "",
        email: "",
        password: "",
        role: "user",
        is_active: true,
      })

      // Clear notification after 3 seconds
      setTimeout(() => setNotification(null), 3000)
    } catch (error) {
      console.error("Error adding user:", error)
      setNotification({
        type: "error",
        message: error.message || "Failed to create user",
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
          <DialogTitle>Add New User</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="username">
              Username <span className="text-destructive">*</span>
            </Label>
            <Input
              id="username"
              value={newUser.username}
              onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
              className="bg-background border-input text-foreground"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">
              Email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              className="bg-background border-input text-foreground"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">
              Password <span className="text-destructive">*</span>
            </Label>
            <Input
              id="password"
              type="password"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              className="bg-background border-input text-foreground"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={newUser.role} onValueChange={(value) => setNewUser({ ...newUser, role: value })}>
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
              checked={newUser.is_active}
              onCheckedChange={(checked) => setNewUser({ ...newUser, is_active: checked })}
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
            onClick={handleAddUser}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <RefreshCw className="h-3 w-3 mr-1 animate-spin text-white" />
                Creating...
              </>
            ) : (
              "Add User"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

