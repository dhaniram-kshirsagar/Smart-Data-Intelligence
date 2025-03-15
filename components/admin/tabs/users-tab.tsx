"use client"

import { useState } from "react"
import { UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAdminStore } from "@/lib/admin/store"
import { EditUserDialog } from "@/components/admin/dialogs/edit-user-dialog"
import { DeleteUserDialog } from "@/components/admin/dialogs/delete-user-dialog"
import { AddUserDialog } from "@/components/admin/dialogs/add-user-dialog"
import { formatDate } from "@/lib/utils/date-formatter"

export function UsersTab() {
  const { users } = useAdminStore()
  const [editUserDialog, setEditUserDialog] = useState(false)
  const [deleteUserDialog, setDeleteUserDialog] = useState(false)
  const [addUserDialog, setAddUserDialog] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)

  const openEditUserDialog = (user) => {
    setCurrentUser(user)
    setEditUserDialog(true)
  }

  const openDeleteUserDialog = (user) => {
    setCurrentUser(user)
    setDeleteUserDialog(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-foreground">User Management</h2>
        <Button
          className="bg-violet-600 hover:bg-violet-700 text-white btn-glow"
          onClick={() => setAddUserDialog(true)}
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      <div className="bg-card p-4 rounded-lg border border-border overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border">
              <th className="p-3 text-muted-foreground">ID</th>
              <th className="p-3 text-muted-foreground">Username</th>
              <th className="p-3 text-muted-foreground">Email</th>
              <th className="p-3 text-muted-foreground">Role</th>
              <th className="p-3 text-muted-foreground">Status</th>
              <th className="p-3 text-muted-foreground">Created</th>
              <th className="p-3 text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users?.map((user) => (
              <tr key={user.id} className="border-b border-border hover:bg-accent/50">
                <td className="p-3 text-card-foreground">{user.id}</td>
                <td className="p-3 text-card-foreground">{user.username}</td>
                <td className="p-3 text-card-foreground">{user.email}</td>
                <td className="p-3">
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      user.role === "admin"
                        ? "bg-purple-500 text-white"
                        : user.role === "researcher"
                          ? "bg-blue-500 text-white"
                          : "bg-gray-500 text-white"
                    }`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="p-3">
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      user.is_active ? "bg-green-500 text-white" : "bg-red-500 text-white"
                    }`}
                  >
                    {user.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="p-3 text-muted-foreground">
                  {user.created_at ? formatDate(user.created_at, false) : "N/A"}
                </td>
                <td className="p-3">
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-violet-600 text-violet-600 hover:bg-violet-600/20 text-xs h-7"
                      onClick={() => openEditUserDialog(user)}
                    >
                      Edit
                    </Button>
                    {user.username !== "admin" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 border-destructive text-destructive hover:bg-destructive/20"
                        onClick={() => openDeleteUserDialog(user)}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Dialogs */}
      {editUserDialog && <EditUserDialog open={editUserDialog} onOpenChange={setEditUserDialog} user={currentUser} />}

      {deleteUserDialog && (
        <DeleteUserDialog open={deleteUserDialog} onOpenChange={setDeleteUserDialog} user={currentUser} />
      )}

      <AddUserDialog open={addUserDialog} onOpenChange={setAddUserDialog} />
    </div>
  )
}

