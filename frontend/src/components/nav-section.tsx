"use client"

import * as React from "react"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/shadcn/sidebar"

interface NavSectionItem {
  name: string
  url: string
}

interface NavSectionProps {
  title: string
  items: NavSectionItem[]
}

export function NavSection({ title, items }: NavSectionProps) {
  // Return null or a placeholder if items is empty or undefined?
  // Or let the parent component handle this logic. For now, render normally.
  if (!items || items.length === 0) {
      return null; // Don't render the section if there are no items
  }

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>{title}</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.name}>
            <SidebarMenuButton asChild>
              <a href={item.url}>
                <span>{item.name}</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
} 