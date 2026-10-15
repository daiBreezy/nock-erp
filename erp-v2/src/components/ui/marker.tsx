import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

// shadcn/ui Marker (base) — inline status, system note, bordered row or labelled separator in a conversation.
// Written from the docs' API (ui.shadcn.com/docs/components/marker): Marker · MarkerIcon · MarkerContent
const markerVariants = cva(
  "group/marker flex min-w-0 items-center gap-2 text-sm text-muted-foreground [a]:hover:text-foreground [button]:hover:text-foreground",
  {
    variants: {
      variant: {
        default: "",
        border: "border-b pb-2",
        // the divider lines are decorative pseudo-elements — the label is read as ordinary text
        separator: "w-full justify-center text-xs before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

function Marker({ className, variant = "default", render, ...props }: useRender.ComponentProps<"div"> & VariantProps<typeof markerVariants>) {
  return useRender({
    defaultTagName: "div",
    props: mergeProps<"div">({ className: cn(markerVariants({ variant }), className) }, props),
    render,
    state: { slot: "marker", variant },
  })
}

function MarkerIcon({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="marker-icon" aria-hidden className={cn("flex shrink-0 items-center [&>svg]:size-4", className)} {...props} />
}

function MarkerContent({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="marker-content" className={cn("min-w-0", className)} {...props} />
}

export { Marker, MarkerContent, MarkerIcon, markerVariants }
