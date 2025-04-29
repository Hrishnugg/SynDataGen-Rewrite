import { Button } from "@/components/shadcn/button"
import { Separator } from "@/components/shadcn/separator"
import { SidebarTrigger } from "@/components/shadcn/sidebar"

// Define props interface
interface SiteHeaderProps {
  title?: string; // Make title optional
}

export function SiteHeader({ title = "Dashboard" }: SiteHeaderProps) { // Destructure title with default
  return (
    <header className="flex h-[var(--header-height)] shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-[var(--header-height)]">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium">{title}</h1>
      </div>
    </header>
  )
}
