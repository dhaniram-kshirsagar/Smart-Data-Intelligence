"use client"

import { useState, useEffect } from "react"
import { UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAdminStore } from "@/lib/admin/store"
import { EditRoleDialog } from "@/components/admin/dialogs/edit-role-dialog"
import { AddRoleDialog } from "@/components/admin/dialogs/add-role-dialog"

export function PermissionsTab() {
  const { roles, availablePermissions } = useAdminStore()
  const [editRoleDialog, setEditRoleDialog] = useState(false)
  const [addRoleDialog, setAddRoleDialog] = useState(false)
  const [currentRole, setCurrentRole] = useState(null)

  const openEditRoleDialog = (role) => {
    setCurrentRole(role)
    setEditRoleDialog(true)
  }

  // Ensure we get the latest roles when the component mounts
  useEffect(() => {
    // This is just to ensure the component re-renders when roles change
    // The actual roles are already in the store
  }, [roles])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-foreground">Role Management</h2>
        <Button
          className="bg-violet-600 hover:bg-violet-700 text-white btn-glow"
          onClick={() => setAddRoleDialog(true)}
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Add Role
        </Button>
      </div>

      <p className="text-muted-foreground mb-6">
        Configure role-based permissions and access controls for your application.
      </p>

      <div className="bg-card p-6 rounded-lg border border-border">
        <div className="space-y-4">
          {roles.map((role) => (
            <div key={role.id} className="p-4 border border-border rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-card-foreground font-medium mb-2">{role.name}</h4>
                  <p className="text-muted-foreground text-sm mb-2">{role.description}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {role.permissions.map((permission) => (
                      <span key={permission} className="px-2 py-1 bg-accent rounded-md text-xs text-foreground">
                        {availablePermissions.find((p) => p.id === permission)?.name || permission}
                      </span>
                    ))}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-violet-600 text-violet-600 hover:bg-violet-600/20 text-xs h-7"
                  onClick={() => openEditRoleDialog(role)}
                >
                  Edit Role
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dialogs */}
      {editRoleDialog && <EditRoleDialog open={editRoleDialog} onOpenChange={setEditRoleDialog} role={currentRole} />}

      <AddRoleDialog open={addRoleDialog} onOpenChange={setAddRoleDialog} />
    </div>
  )
}

