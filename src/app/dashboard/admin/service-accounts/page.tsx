"use client";

import { useState, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FiExternalLink, FiSearch } from "react-icons/fi";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { toast } from "sonner";

// Service account overview interface
interface ServiceAccountOverview {
  id: string;
  email: string;
  customerId: string;
  customerName: string;
  createdAt: string;
  lastKeyRotation: string;
}

export default function ServiceAccountsPage() {
  const [serviceAccounts, setServiceAccounts] = useState<ServiceAccountOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // This would be implemented in a real API
  useEffect(() => {
    // Simulated data for now - in a real implementation, we would fetch this from an API
    const fetchServiceAccounts = async () => {
      try {
        setLoading(true);
        
        // In a real implementation, this would be an API call
        // For now, we'll simulate the data
        setTimeout(() => {
          const sampleData: ServiceAccountOverview[] = [
            {
              id: "sa-001",
              email: "acme-corp@synthetic-data-gen.iam.gserviceaccount.com",
              customerId: "cust-001",
              customerName: "Acme Corporation",
              createdAt: "2023-06-12T14:32:00.000Z",
              lastKeyRotation: "2023-12-15T09:21:33.000Z"
            },
            {
              id: "sa-002",
              email: "globex-inc@synthetic-data-gen.iam.gserviceaccount.com",
              customerId: "cust-002",
              customerName: "Globex Inc.",
              createdAt: "2023-07-18T11:45:00.000Z",
              lastKeyRotation: "2024-01-05T16:42:18.000Z"
            },
            {
              id: "sa-003",
              email: "initech@synthetic-data-gen.iam.gserviceaccount.com",
              customerId: "cust-003",
              customerName: "Initech",
              createdAt: "2023-08-23T16:12:00.000Z",
              lastKeyRotation: "2024-02-10T10:15:44.000Z"
            }
          ];
          
          setServiceAccounts(sampleData);
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error("Error fetching service accounts:", error);
        toast.error("Failed to load service accounts. Please try again.");
        setLoading(false);
      }
    };
    
    fetchServiceAccounts();
  }, []);

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real implementation, we would filter by making an API call
    // For this demo, just show a notification
    toast.info(`Searching for: ${searchQuery}`);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Calculate days since key rotation
  const getDaysSinceRotation = (dateString: string) => {
    const rotationDate = new Date(dateString);
    const currentDate = new Date();
    const differenceInTime = currentDate.getTime() - rotationDate.getTime();
    const differenceInDays = Math.floor(differenceInTime / (1000 * 3600 * 24));
    return differenceInDays;
  };

  // Get rotation status badge color
  const getRotationStatusBadge = (dateString: string) => {
    const days = getDaysSinceRotation(dateString);
    
    if (days > 90) {
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    } else if (days > 60) {
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    } else {
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    }
  };

  return (
    <div className="w-full">
      <Card>
        <CardHeader>
          <CardTitle>Service Accounts</CardTitle>
          <CardDescription>
            Overview of all service accounts across customers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <form onSubmit={handleSearch} className="relative w-full max-w-md">
              <Input
                placeholder="Search by ID, email or customer name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
              <Button 
                type="submit"
                variant="ghost" 
                size="icon"
                className="absolute right-0 top-0 h-full"
              >
                <FiSearch className="h-4 w-4" />
              </Button>
            </form>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Key Rotation</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10">
                      <p className="text-gray-500 dark:text-gray-400">Loading service accounts...</p>
                    </TableCell>
                  </TableRow>
                ) : serviceAccounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10">
                      <p className="text-gray-500 dark:text-gray-400">No service accounts found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  serviceAccounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-mono text-sm">{account.id}</TableCell>
                      <TableCell className="font-mono text-sm max-w-[200px] truncate">
                        {account.email}
                      </TableCell>
                      <TableCell>{account.customerName}</TableCell>
                      <TableCell>{formatDate(account.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge className={getRotationStatusBadge(account.lastKeyRotation)}>
                            {getDaysSinceRotation(account.lastKeyRotation)} days ago
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/dashboard/admin/customers/${account.customerId}`}>
                            <FiExternalLink className="mr-2 h-4 w-4" />
                            View Customer
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 