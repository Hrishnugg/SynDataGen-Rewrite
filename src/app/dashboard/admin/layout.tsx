"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  
  const tabs = [
    {
      value: "customers",
      label: "Customers",
      href: "/dashboard/admin/customers",
      active: pathname.startsWith("/dashboard/admin/customers")
    },
    {
      value: "service-accounts",
      label: "Service Accounts",
      href: "/dashboard/admin/service-accounts",
      active: pathname.startsWith("/dashboard/admin/service-accounts")
    },
    {
      value: "security",
      label: "Security",
      href: "/dashboard/admin/security",
      active: pathname.startsWith("/dashboard/admin/security")
    }
  ];
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Admin Panel</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Manage customers, service accounts, and security settings
        </p>
      </div>
      
      <Card className="p-1">
        <Tabs defaultValue={tabs.find(tab => tab.active)?.value || "customers"}>
          <TabsList className="grid grid-cols-3">
            {tabs.map(tab => (
              <Link href={tab.href} key={tab.value} className="w-full">
                <TabsTrigger
                  value={tab.value}
                  className={cn(
                    tab.active && "bg-muted",
                    "w-full"
                  )}
                >
                  {tab.label}
                </TabsTrigger>
              </Link>
            ))}
          </TabsList>
        </Tabs>
      </Card>
      
      {children}
    </div>
  );
} 