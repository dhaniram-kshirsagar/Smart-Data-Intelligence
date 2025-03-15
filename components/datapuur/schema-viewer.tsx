"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { motion } from "framer-motion"

export function SchemaViewer({ schema }) {
  const [expandedFields, setExpandedFields] = useState({})

  if (!schema || !schema.fields) {
    return (
      <div className="text-center p-4 text-muted-foreground">
        No schema detected yet. Upload a file or connect to a database to view the schema.
      </div>
    )
  }

  const toggleField = (fieldName) => {
    setExpandedFields({
      ...expandedFields,
      [fieldName]: !expandedFields[fieldName],
    })
  }

  const getTypeColor = (type) => {
    switch (type.toLowerCase()) {
      case "string":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
      case "number":
      case "integer":
      case "float":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "boolean":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
      case "date":
      case "datetime":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
      case "object":
        return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300"
      case "array":
        return "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
    }
  }

  const downloadSchema = () => {
    const schemaJson = JSON.stringify(schema, null, 2)
    const blob = new Blob([schemaJson], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "schema.json"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h4 className="font-medium text-foreground">{schema.name || "Data Schema"}</h4>
          <p className="text-sm text-muted-foreground">{schema.fields.length} fields detected</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={downloadSchema}
          className="text-primary border-primary hover:bg-primary/10"
        >
          <Download className="h-4 w-4 mr-2" />
          Download Schema
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="grid grid-cols-12 gap-4 p-3 bg-muted text-muted-foreground font-medium text-sm">
          <div className="col-span-4">Field Name</div>
          <div className="col-span-2">Type</div>
          <div className="col-span-2">Format</div>
          <div className="col-span-2">Nullable</div>
          <div className="col-span-2">Sample</div>
        </div>

        <div className="divide-y divide-border">
          {schema.fields.map((field, index) => (
            <motion.div
              key={field.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="grid grid-cols-12 gap-4 p-3 hover:bg-muted/50 cursor-pointer"
              onClick={() => toggleField(field.name)}
            >
              <div className="col-span-4 font-medium text-foreground flex items-center">
                {field.children && field.children.length > 0 ? (
                  expandedFields[field.name] ? (
                    <ChevronDown className="h-4 w-4 mr-1 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 mr-1 text-muted-foreground" />
                  )
                ) : (
                  <span className="w-5" />
                )}
                {field.name}
              </div>
              <div className="col-span-2">
                <Badge className={`font-normal ${getTypeColor(field.type)}`}>{field.type}</Badge>
              </div>
              <div className="col-span-2 text-muted-foreground">{field.format || "-"}</div>
              <div className="col-span-2 text-muted-foreground">{field.nullable ? "Yes" : "No"}</div>
              <div className="col-span-2 text-muted-foreground truncate">
                {field.sample !== undefined && field.sample !== null
                  ? String(field.sample).substring(0, 20) + (String(field.sample).length > 20 ? "..." : "")
                  : "-"}
              </div>

              {/* Nested fields */}
              {expandedFields[field.name] && field.children && field.children.length > 0 && (
                <div className="col-span-12 pl-6 border-l-2 border-muted ml-2 mt-2">
                  <div className="space-y-2">
                    {field.children.map((child, childIndex) => (
                      <div
                        key={`${field.name}-${child.name}`}
                        className="grid grid-cols-12 gap-4 p-2 bg-muted/30 rounded-md"
                      >
                        <div className="col-span-4 font-medium text-foreground">{child.name}</div>
                        <div className="col-span-2">
                          <Badge className={`font-normal ${getTypeColor(child.type)}`}>{child.type}</Badge>
                        </div>
                        <div className="col-span-2 text-muted-foreground">{child.format || "-"}</div>
                        <div className="col-span-2 text-muted-foreground">{child.nullable ? "Yes" : "No"}</div>
                        <div className="col-span-2 text-muted-foreground truncate">
                          {child.sample !== undefined && child.sample !== null
                            ? String(child.sample).substring(0, 20) + (String(child.sample).length > 20 ? "..." : "")
                            : "-"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

