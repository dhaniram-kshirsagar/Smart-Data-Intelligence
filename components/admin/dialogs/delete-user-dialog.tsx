"use client"

import { RefreshCw } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useAdminStore } from "@/lib/admin/store"
import { deleteUser } from "@/lib/admin/api"

interface DeleteUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: any
}

export function DeleteUserDialog({ open, onOpenChange, user }: DeleteUserDialogProps) {
  const { users, setUsers, isProcessing, setIsProcessing, setNotification } = useAdminStore()

  const handleDeleteUser = async () => {
    setIsProcessing(true)
    try {
      await deleteUser(user.id)

      // Update users list
      setUsers(users.filter((u) => u.id !== user.id))

      setNotification({
        type: "success",
        message: `User ${user.username} deleted successfully`,
      })

      // Close dialog
      onOpenChange(false)

      // Clear notification after 3 seconds
      setTimeout(() => setNotification(null), 3000)
    } catch (error) {
      console.error("Error deleting user:", error)
      setNotification({
        type: "error",
        message: error.message || "Failed to delete user",
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
          <DialogTitle>Delete User</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p>
            Are you sure you want to delete user <strong>{user.username}</strong>?
          </p>
          <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-destructive hover:bg-destructive/80 text-white"
            onClick={handleDeleteUser}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <RefreshCw className="h-3 w-3 mr-1 animate-spin text-white" />
                Deleting...
              </>
            ) : (
              "Delete User"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

