export async function fetchAdminData(): Promise<{
  stats: any;
  users: any;
  activity: any;
  systemSettings: any;
}> {
  try {
    // Get API base URL
    const getApiUrl = () => {
      if (process.env.NEXT_PUBLIC_API_URL) {
        return process.env.NEXT_PUBLIC_API_URL;
      }
      return "http://172.104.129.10:9090/api";
    };

    const apiUrl = getApiUrl();
    const token = localStorage.getItem("token");
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    };

    // Fetch system stats
    const statsResponse = await fetch(`${apiUrl}/admin/stats`, { headers });
    
    // Fetch users
    const usersResponse = await fetch(`${apiUrl}/admin/users`, { headers });
    
    // Fetch system settings
    const settingsResponse = await fetch(`${apiUrl}/admin/settings`, { headers });
    
    // Check if main responses are OK before proceeding
    if (!statsResponse.ok || !usersResponse.ok || !settingsResponse.ok) {
      console.error("Failed to fetch admin data:", {
        stats: statsResponse.status,
        users: usersResponse.status,
        settings: settingsResponse.status
      });
      throw new Error("Failed to fetch admin data");
    }

    // Parse main responses
    const statsData = await statsResponse.json();
    const usersData = await usersResponse.json();
    const settingsData = await settingsResponse.json();

    // Fetch activity logs with a timestamp parameter to avoid caching
    let activityData = [];
    try {
      const timestamp = new Date().getTime();
      const activityResponse = await fetch(`${apiUrl}/admin/activity?limit=50&_t=${timestamp}`, { headers });
      if (activityResponse.ok) {
        activityData = await activityResponse.json();
        
        // Log the activity data for debugging
        console.log("Fetched activity data:", activityData);
        
        // Ensure all activities have a valid username
        activityData = activityData.map((item: any) => ({
          ...item,
          username: item.username || "anonymous",
        }));
      } else {
        console.warn("Activity logs fetch returned non-OK status:", activityResponse.status);
        throw new Error(`Failed to fetch activity logs: ${activityResponse.statusText}`);
      }
    } catch (err) {
      console.error("Error fetching activity logs:", err);
      // Fallback data for activity only - don't throw the main error
      activityData = [
        {
          id: 1,
          action: "User login",
          username: "admin",
          timestamp: new Date().toISOString(),
          details: "Activity log system initialized with fallback data",
          page_url: null,
        },
      ];
    }

    return {
      stats: statsData,
      users: usersData,
      activity: activityData,
      systemSettings: settingsData,
    };
  } catch (err) {
    console.error("Error fetching admin data:", err);

    // Return mock data as fallback
    return {
      stats: {
        total_users: 42,
        active_users: 38,
        researchers: 15,
        regular_users: 26,
        system_uptime: "3 days, 7 hours",
        database_size: "42.5 MB",
      },
      users: [
        {
          id: 1,
          username: "admin",
          email: "admin@example.com",
          role: "admin",
          is_active: true,
          created_at: new Date().toISOString(), 
        },
        {
          id: 2,
          username: "researcher",
          email: "researcher@example.com",
          role: "researcher",
          is_active: true,
          created_at: new Date(Date.now() - 24 * 60 * 60000).toISOString(), 
        },
        {
          id: 3,
          username: "user",
          email: "user@example.com",
          role: "user",
          is_active: true,
          created_at: new Date(Date.now() - 48 * 60 * 60000).toISOString(), 
        },
      ],
      activity: [
        {
          id: 1,
          action: "Login",
          username: "admin", 
          timestamp: new Date().toISOString(),
          details: "User admin logged in successfully",
          page_url: null,
        },
        {
          id: 2,
          action: "Page visit",
          username: "researcher",
          timestamp: new Date(Date.now() - 15 * 60000).toISOString(), 
          details: "Visited dashboard page",
          page_url: "/datapuur/dashboard",
        },
        {
          id: 3,
          action: "Failed login attempt",
          username: "unknown",
          timestamp: new Date(Date.now() - 30 * 60000).toISOString(), 
          details: "Invalid credentials",
          page_url: null,
        },
      ],
      systemSettings: {
        maintenance_mode: false,
        debug_mode: true,
        api_rate_limiting: true,
        last_backup: new Date(Date.now() - 24 * 60 * 60000).toISOString(), 
      },
    };
  }
}

export async function createUser(userData: any): Promise<any> {
  try {
    const getApiUrl = () => {
      if (process.env.NEXT_PUBLIC_API_URL) {
        return process.env.NEXT_PUBLIC_API_URL;
      }
      return "http://172.104.129.10:9090/api";
    };

    const apiUrl = getApiUrl();
    const token = localStorage.getItem("token");
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    };

    const response = await fetch(`${apiUrl}/admin/users`, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "Failed to create user");
    }

    const newUser = await response.json();
    // Ensure created_at is set if not provided by the API
    if (!newUser.created_at) {
      newUser.created_at = new Date().toISOString();
    }
    return newUser;
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
}

export async function updateUser(userId: number, userData: any): Promise<any> {
  try {
    const getApiUrl = () => {
      if (process.env.NEXT_PUBLIC_API_URL) {
        return process.env.NEXT_PUBLIC_API_URL;
      }
      return "http://172.104.129.10:9090/api";
    };

    const apiUrl = getApiUrl();
    const token = localStorage.getItem("token");
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    };

    const response = await fetch(`${apiUrl}/admin/users/${userId}`, {
      method: "PUT",
      headers: headers,
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "Failed to update user");
    }

    return await response.json();
  } catch (error) {
    console.error("Error updating user:", error);
    throw error;
  }
}

export async function deleteUser(userId: number): Promise<void> {
  try {
    const getApiUrl = () => {
      if (process.env.NEXT_PUBLIC_API_URL) {
        return process.env.NEXT_PUBLIC_API_URL;
      }
      return "http://172.104.129.10:9090/api";
    };

    const apiUrl = getApiUrl();
    const token = localStorage.getItem("token");
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    };

    const response = await fetch(`${apiUrl}/admin/users/${userId}`, {
      method: "DELETE",
      headers: headers,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "Failed to delete user");
    }

    return;
  } catch (error) {
    console.error("Error deleting user:", error);
    throw error;
  }
}

export async function updateSystemSetting(setting: string, value: any): Promise<any> {
  try {
    const getApiUrl = () => {
      if (process.env.NEXT_PUBLIC_API_URL) {
        return process.env.NEXT_PUBLIC_API_URL;
      }
      return "http://172.104.129.10:9090/api";
    };

    const apiUrl = getApiUrl();
    const token = localStorage.getItem("token");
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    };

    const response = await fetch(`${apiUrl}/admin/settings`, {
      method: "PUT",
      headers: headers,
      body: JSON.stringify({ [setting]: value }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "Failed to update system setting");
    }

    return await response.json();
  } catch (error) {
    console.error("Error updating system setting:", error);
    throw error;
  }
}

export async function runBackup(): Promise<any> {
  try {
    const getApiUrl = () => {
      if (process.env.NEXT_PUBLIC_API_URL) {
        return process.env.NEXT_PUBLIC_API_URL;
      }
      return "http://172.104.129.10:9090/api";
    };

    const apiUrl = getApiUrl();
    const token = localStorage.getItem("token");
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    };

    const response = await fetch(`${apiUrl}/admin/backup`, {
      method: "POST",
      headers: headers,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "Failed to run backup");
    }

    return await response.json();
  } catch (error) {
    console.error("Error running backup:", error);
    throw error;
  }
}

export async function exportData(): Promise<any> {
  try {
    const getApiUrl = () => {
      if (process.env.NEXT_PUBLIC_API_URL) {
        return process.env.NEXT_PUBLIC_API_URL;
      }
      return "http://172.104.129.10:9090/api";
    };

    const apiUrl = getApiUrl();
    const token = localStorage.getItem("token");
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    };

    const response = await fetch(`${apiUrl}/admin/export-data`, {
      method: "POST",
      headers: headers,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "Failed to export data");
    }

    return await response.json();
  } catch (error) {
    console.error("Error exporting data:", error);
    throw error;
  }
}

export async function clearActivityLogs(days: number): Promise<void> {
  try {
    const getApiUrl = () => {
      if (process.env.NEXT_PUBLIC_API_URL) {
        return process.env.NEXT_PUBLIC_API_URL;
      }
      return "http://172.104.129.10:9090/api";
    };

    const apiUrl = getApiUrl();
    const token = localStorage.getItem("token");
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    };

    const response = await fetch(`${apiUrl}/admin/activity/clear${days ? `?days=${days}` : ""}`, {
      method: "DELETE",
      headers: headers,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "Failed to clear activity logs");
    }

    return;
  } catch (error) {
    console.error("Error clearing activity logs:", error);
    throw error;
  }
}

export async function cleanupData(): Promise<any> {
  try {
    const getApiUrl = () => {
      if (process.env.NEXT_PUBLIC_API_URL) {
        return process.env.NEXT_PUBLIC_API_URL;
      }
      return "http://172.104.129.10:9090/api";
    };

    const apiUrl = getApiUrl();
    const token = localStorage.getItem("token");
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    };

    const response = await fetch(`${apiUrl}/admin/cleanup-data`, {
      method: "POST",
      headers: headers,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "Failed to cleanup data");
    }

    return await response.json();
  } catch (error) {
    console.error("Error cleaning up data:", error);
    throw error;
  }
}
