"use client"

import { useState } from "react"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { InfoIcon as InfoCircle } from "lucide-react"

export function ChunkSizeConfig({ chunkSize, onChunkSizeChange, disabled = false }) {
  const [localChunkSize, setLocalChunkSize] = useState(chunkSize)

  const handleSliderChange = (value) => {
    const newValue = value[0]
    setLocalChunkSize(newValue)
    onChunkSizeChange(newValue)
  }

  const handleInputChange = (e) => {
    const value = Number.parseInt(e.target.value)
    if (!isNaN(value) && value >= 100 && value <= 10000) {
      setLocalChunkSize(value)
      onChunkSizeChange(value)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start">
        <div className="flex-1">
          <Label htmlFor="chunkSize" className="text-foreground mb-1 block">
            Chunk Size (records per batch)
          </Label>
          <div className="text-sm text-muted-foreground mb-4">
            Adjust the number of records processed at once for optimal performance
          </div>
        </div>
        <div className="w-24">
          <Input
            id="chunkSize"
            type="number"
            min={100}
            max={10000}
            step={100}
            value={localChunkSize}
            onChange={handleInputChange}
            disabled={disabled}
            className="text-right"
          />
        </div>
      </div>

      <Slider
        value={[localChunkSize]}
        min={100}
        max={10000}
        step={100}
        onValueChange={handleSliderChange}
        disabled={disabled}
        className="py-4"
      />

      <div className="flex justify-between text-xs text-muted-foreground">
        <span>100</span>
        <span>1000</span>
        <span>5000</span>
        <span>10000</span>
      </div>

      <div className="mt-4 p-3 bg-muted/50 rounded-md border border-border">
        <div className="flex items-start">
          <InfoCircle className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Performance Considerations:</p>
            <ul className="list-disc list-inside space-y-1 ml-1">
              <li>
                <span className="font-medium">Smaller chunks</span> (100-500): Use for complex data or limited memory
              </li>
              <li>
                <span className="font-medium">Medium chunks</span> (500-2000): Balanced performance for most datasets
              </li>
              <li>
                <span className="font-medium">Larger chunks</span> (2000+): Faster for simple data with ample resources
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

