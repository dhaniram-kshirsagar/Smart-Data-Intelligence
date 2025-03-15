/**
 * Formats a date string or Date object into a consistent, human-readable format
 * @param dateInput Date string or Date object
 * @param includeSeconds Whether to include seconds in the formatted time
 * @returns Formatted date string
 */
export function formatDate(dateInput: string | Date | null | undefined, includeSeconds = true): string {
  if (!dateInput) return "N/A"

  try {
    const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return "Invalid date"
    }

    // Format options
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }

    if (includeSeconds) {
      options.second = "2-digit"
    }

    // Use toLocaleString with appropriate locale
    return date.toLocaleString("en-US", options)
  } catch (error) {
    console.error("Error formatting date:", error)
    return "Error formatting date"
  }
}

/**
 * Returns a relative time string (e.g., "2 minutes ago")
 * @param dateInput Date string or Date object
 * @returns Relative time string
 */
export function getRelativeTime(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "N/A"

  try {
    const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return "Invalid date"
    }

    // Get current time
    const now = new Date()

    // Calculate time difference in seconds
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) {
      return `${diffInSeconds} second${diffInSeconds !== 1 ? "s" : ""} ago`
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60)
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes !== 1 ? "s" : ""} ago`
    }

    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours !== 1 ? "s" : ""} ago`
    }

    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 30) {
      return `${diffInDays} day${diffInDays !== 1 ? "s" : ""} ago`
    }

    const diffInMonths = Math.floor(diffInDays / 30)
    if (diffInMonths < 12) {
      return `${diffInMonths} month${diffInMonths !== 1 ? "s" : ""} ago`
    }

    const diffInYears = Math.floor(diffInMonths / 12)
    return `${diffInYears} year${diffInYears !== 1 ? "s" : ""} ago`
  } catch (error) {
    console.error("Error calculating relative time:", error)
    return "Error calculating time"
  }
}

