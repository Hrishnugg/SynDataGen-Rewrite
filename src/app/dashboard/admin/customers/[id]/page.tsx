"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FiAlertTriangle, FiCheckCircle, FiEdit, FiKey, FiRefreshCw, FiTrash, FiUserCheck } from "react-icons/fi";
import { toast } from "sonner";
import CustomerServiceAccountPanel from "@/components/dashboard/CustomerServiceAccountPanel";

// Customer interface with service account details
interface Customer {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive' | 'suspended';
  billingTier?: 'free' | 'basic' | 'professional' | 'enterprise';
  createdAt: string;
  updatedAt: string;
  usageStatistics?: {
    lastLoginDate?: string;
    totalProjects?: number;
    totalDataGenerated?: number;
    apiRequestsThisMonth?: number;
    lastAccessedAt?: string;
  };
  contactInfo?: {
    primary: {
      name: string;
      email: string;
      phone?: string;
    };
    billing?: {
      name: string;
      email: string;
      phone?: string;
    };
    technical?: {
      name: string;
      email: string;
      phone?: string;
    };
  };
  gcpConfig?: {
    serviceAccountId?: string;
    serviceAccountEmail?: string;
    serviceAccountKeyRef?: string;
  };
  settings: {
    storageQuota: number;
    maxProjects: number;
  };
}

export default function CustomerDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreatingServiceAccount, setIsCreatingServiceAccount] = useState(false);
  const [isRotatingKey, setIsRotatingKey] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Fetch customer details
  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/customers/${params.id}`);
        
        if (!response.ok) {
          throw new Error("Failed to fetch customer details");
        }
        
        const data = await response.json();
        setCustomer(data);
      } catch (error) {
        console.error("Error fetching customer:", error);
        toast.error("Failed to load customer details. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchCustomer();
    }
  }, [params.id]);

  // Create service account
  const createServiceAccount = async () => {
    if (!customer) return;
    
    try {
      setIsCreatingServiceAccount(true);
      
      const response = await fetch(`/api/customers/${customer.id}/service-account`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerId: customer.id,
          customerName: customer.name,
          billingTier: customer.billingTier
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to create service account");
      }
      
      const data = await response.json();
      
      // Update customer data with new service account info
      setCustomer({
        ...customer,
        gcpConfig: {
          serviceAccountId: data.accountId,
          serviceAccountEmail: data.email,
          serviceAccountKeyRef: data.keySecretName,
        },
      });
      
      toast.success("Service account created successfully");
    } catch (error) {
      console.error("Error creating service account:", error);
      toast.error("Failed to create service account. Please try again.");
    } finally {
      setIsCreatingServiceAccount(false);
    }
  };

  // Rotate service account key
  const rotateServiceAccountKey = async () => {
    if (!customer || !customer.gcpConfig?.serviceAccountId) return;
    
    try {
      setIsRotatingKey(true);
      
      const response = await fetch(`/api/customers/${customer.id}/service-account/rotate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        throw new Error("Failed to rotate service account key");
      }
      
      const data = await response.json();
      
      // Update customer data with new key reference
      setCustomer({
        ...customer,
        gcpConfig: {
          ...customer.gcpConfig,
          serviceAccountKeyRef: data.keySecretName,
        },
      });
      
      toast.success("Service account key rotated successfully");
    } catch (error) {
      console.error("Error rotating service account key:", error);
      toast.error("Failed to rotate service account key. Please try again.");
    } finally {
      setIsRotatingKey(false);
    }
  };

  // Delete service account
  const deleteServiceAccount = async () => {
    if (!customer || !customer.gcpConfig?.serviceAccountId) return;
    
    try {
      const response = await fetch(`/api/customers/${customer.id}/service-account`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        throw new Error("Failed to delete service account");
      }
      
      // Update customer data by removing service account info
      setCustomer({
        ...customer,
        gcpConfig: {},
      });
      
      setShowDeleteDialog(false);
      toast.success("Service account deleted successfully");
    } catch (error) {
      console.error("Error deleting service account:", error);
      toast.error("Failed to delete service account. Please try again.");
    }
  };

  // Handle service account actions for new component
  const handleCreateServiceAccount = async () => {
    if (!customer) return;
    await createServiceAccount();
  };

  const handleDeleteServiceAccount = async () => {
    if (!customer || !customer.gcpConfig?.serviceAccountId) return;
    await deleteServiceAccount();
  };

  const handleRotateServiceAccountKey = async () => {
    if (!customer || !customer.gcpConfig?.serviceAccountId) return;
    await rotateServiceAccountKey();
  };

  // Map the old service account structure to the new one
  const getServiceAccountData = () => {
    if (!customer || !customer.gcpConfig?.serviceAccountId) {
      return undefined;
    }
    
    return {
      email: customer.gcpConfig.serviceAccountEmail || '',
      keyReference: customer.gcpConfig.serviceAccountKeyRef || '',
      created: customer.createdAt, // We don't have a specific date for SA creation
      lastRotated: customer.updatedAt, // We don't have a specific date for key rotation
    };
  };

  // Format dates for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <p className="text-lg text-gray-500">Loading customer details...</p>
      </div>
    );
  }

  // Error state
  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <p className="text-lg text-gray-500 mb-4">Customer not found</p>
        <Button onClick={() => router.push("/dashboard/admin/customers")}>
          Return to Customer List
        </Button>
      </div>
    );
  }

  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "inactive":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
      case "suspended":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Button 
            variant="outline" 
            className="mb-2"
            onClick={() => router.push("/dashboard/admin/customers")}
          >
            Back to Customers
          </Button>
          <h1 className="text-2xl font-bold">Customer: {customer.name}</h1>
        </div>
        <Button variant="outline">
          <FiEdit className="mr-2 h-4 w-4" />
          Edit Customer
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Customer Overview Card */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center mb-6">
              <Avatar className="h-16 w-16 mr-4">
                <AvatarFallback className="text-xl">
                  {customer.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-lg font-semibold">{customer.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{customer.email}</p>
                <div className="mt-1">
                  <Badge className={getStatusBadgeColor(customer.status)}>
                    {customer.status}
                  </Badge>
                  {customer.billingTier && (
                    <Badge className="ml-2 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                      {customer.billingTier}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Created</span>
                <span className="text-sm font-medium">{formatDate(customer.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Last Updated</span>
                <span className="text-sm font-medium">{formatDate(customer.updatedAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Last Login</span>
                <span className="text-sm font-medium">
                  {formatDate(customer.usageStatistics?.lastLoginDate)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Storage Quota</span>
                <span className="text-sm font-medium">{customer.settings.storageQuota} GB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Max Projects</span>
                <span className="text-sm font-medium">{customer.settings.maxProjects}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Usage Statistics Card */}
        <Card>
          <CardHeader>
            <CardTitle>Usage Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Projects</p>
                <div className="flex items-center">
                  <p className="text-2xl font-bold">
                    {customer.usageStatistics?.totalProjects || 0}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                    / {customer.settings.maxProjects}
                  </p>
                </div>
                <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full mt-2">
                  <div
                    className="h-2 bg-blue-500 rounded-full"
                    style={{
                      width: `${Math.min(
                        ((customer.usageStatistics?.totalProjects || 0) / customer.settings.maxProjects) * 100,
                        100
                      )}%`,
                    }}
                  ></div>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Storage Used</p>
                <div className="flex items-center">
                  <p className="text-2xl font-bold">
                    {((customer.usageStatistics?.totalDataGenerated || 0) / (1024 * 1024 * 1024)).toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                    / {customer.settings.storageQuota} GB
                  </p>
                </div>
                <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full mt-2">
                  <div
                    className="h-2 bg-purple-500 rounded-full"
                    style={{
                      width: `${Math.min(
                        ((customer.usageStatistics?.totalDataGenerated || 0) / 
                          (customer.settings.storageQuota * 1024 * 1024 * 1024)) * 100,
                        100
                      )}%`,
                    }}
                  ></div>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">API Requests This Month</p>
                <p className="text-2xl font-bold">
                  {customer.usageStatistics?.apiRequestsThisMonth || 0}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Last Activity</p>
                <p className="text-lg font-medium">
                  {formatDate(customer.usageStatistics?.lastAccessedAt)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information Card */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Primary Contact
                </h3>
                <p className="font-medium">{customer.contactInfo?.primary.name || customer.name}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {customer.contactInfo?.primary.email || customer.email}
                </p>
                {customer.contactInfo?.primary.phone && (
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {customer.contactInfo.primary.phone}
                  </p>
                )}
              </div>

              {customer.contactInfo?.billing && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Billing Contact
                  </h3>
                  <p className="font-medium">{customer.contactInfo.billing.name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {customer.contactInfo.billing.email}
                  </p>
                  {customer.contactInfo.billing.phone && (
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {customer.contactInfo.billing.phone}
                    </p>
                  )}
                </div>
              )}

              {customer.contactInfo?.technical && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Technical Contact
                  </h3>
                  <p className="font-medium">{customer.contactInfo.technical.name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {customer.contactInfo.technical.email}
                  </p>
                  {customer.contactInfo.technical.phone && (
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {customer.contactInfo.technical.phone}
                    </p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Service Account Management */}
      <CustomerServiceAccountPanel
        customer={{
          ...(customer as any),
          serviceAccount: getServiceAccountData()
        }}
        isLoading={loading}
        onCreateServiceAccount={handleCreateServiceAccount}
        onDeleteServiceAccount={handleDeleteServiceAccount}
        onRotateServiceAccountKey={handleRotateServiceAccountKey}
      />
    </div>
  );
} 