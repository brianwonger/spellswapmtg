import * as React from "react"

import { cn } from "@/lib/utils"

function Separator({ 
  className, 
  orientation = "horizontal",
  ...props 
}: React.ComponentProps<"div"> & {
  orientation?: "horizontal" | "vertical"
}) {
  return (
    <div
      data-slot="separator"
      className={cn(
        "border-border shrink-0",
        orientation === "horizontal" 
          ? "h-px w-full border-t" 
          : "w-px h-full border-l",
        className
      )}
      {...props}
    />
  )
}

export { Separator }
