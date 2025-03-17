import * as React from "react"
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react"

import { cn } from "@/lib/utils/utils"
import { ButtonProps, buttonVariants } from "@/components/ui/button"

interface PaginationProps extends React.ComponentProps<"nav"> {
  disabled?: boolean;
}

const Pagination = ({ className, disabled, ...props }: PaginationProps) => (
  <nav
    role="navigation"
    aria-label="pagination"
    className={cn("mx-auto flex w-full justify-center", className,
        disabled && "pointer-events-none opacity-50")}
    {...props}
  />
)
Pagination.displayName = "Pagination"

interface PaginationContentProps extends React.ComponentProps<"ul"> {
  disabled?: boolean;
}

const PaginationContent = React.forwardRef<
  HTMLUListElement,
  PaginationContentProps
>(({ className, disabled, ...props }, ref) => (
  <ul
    ref={ref}
    className={cn("flex flex-row items-center gap-1", className,
        disabled && "pointer-events-none opacity-50")}
    {...props}
  />
))
PaginationContent.displayName = "PaginationContent"

interface PaginationItemProps extends React.ComponentProps<"li"> {
  disabled?: boolean;
}

const PaginationItem = React.forwardRef<
  HTMLLIElement,
  PaginationItemProps
>(({ className, disabled, ...props }, ref) => (
  <li ref={ref} className={cn("", className,
        disabled && "pointer-events-none opacity-50")} {...props} />
))
PaginationItem.displayName = "PaginationItem"

type PaginationLinkProps = {
  isActive?: boolean
  disabled?: boolean
} & Pick<ButtonProps, "size"> &
  React.ComponentProps<"a">

const PaginationLink = ({
  className,
  isActive,
  size = "icon",
  disabled,
  ...props
}: PaginationLinkProps) => (
  <a
    aria-current={isActive ? "page" : undefined}
    className={cn(
      buttonVariants({
        variant: isActive ? "outline" : "ghost",
        size,
      }),
      className
    )}
    {...props}
  />
)
PaginationLink.displayName = "PaginationLink"

const PaginationPrevious = ({
  className,
  disabled,
  ...props
}: PaginationLinkProps) => (
  <PaginationLink
    aria-label="Go to previous page"
    size="default"
    className={cn("gap-1 pl-2.5", className,
        disabled && "pointer-events-none opacity-50")}
    {...props}
  >
    <ChevronLeft className="h-4 w-4" />
    <span>Previous</span>
  </PaginationLink>
)
PaginationPrevious.displayName = "PaginationPrevious"

const PaginationNext = ({
  className,
  disabled,
  ...props
}: PaginationLinkProps) => (
  <PaginationLink
    aria-label="Go to next page"
    size="default"
    className={cn("gap-1 pr-2.5", className,
        disabled && "pointer-events-none opacity-50")}
    {...props}
  >
    <span>Next</span>
    <ChevronRight className="h-4 w-4" />
  </PaginationLink>
)
PaginationNext.displayName = "PaginationNext"

const PaginationEllipsis = ({
  className,
  disabled,
  ...props
}: React.ComponentProps<"span"> & { disabled?: boolean }) => (
  <span
    aria-hidden
    className={cn("flex h-9 w-9 items-center justify-center", className,
        disabled && "pointer-events-none opacity-50")}
    {...props}
  >
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">More pages</span>
  </span>
)
PaginationEllipsis.displayName = "PaginationEllipsis"

export {
  Pagination,
  PaginationContent,
  PaginationLink,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
}
