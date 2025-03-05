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
import { ClientPageProps } from "@/lib/page-utils";

// Define the params type for this specific page
type CustomerDetailParams = {
  id: string;
};

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

export default function CustomerDetailClientPage({ params }: ClientPageProps<CustomerDetailParams>) {
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
          throw new Error('Failed to fetch customer');
        }
        
        const data = await response.json();
        setCustomer(data);
      } catch (error) {
        console.error('Error fetching customer:', error);
        toast.error("Failed to load customer details");
      } finally {
        setLoading(false);
      }
    };
    
    fetchCustomer();
  }, [params.id]);

  // Rest of your component implementation...
  // For brevity, I'm not including all the implementation details

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">
          {loading ? 'Loading...' : customer?.name || 'Customer Details'}
        </h1>
        <Button 
          variant="outline" 
          onClick={() => router.push(`/dashboard/admin/customers/${params.id}/edit`)}
        >
          <FiEdit className="mr-2 h-4 w-4" />
          Edit
        </Button>
      </div>
      
      {/* Sample content - replace with your actual implementation */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Information</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading customer details...</p>
          ) : customer ? (
            <div className="space-y-4">
              <p><strong>ID:</strong> {customer.id}</p>
              <p><strong>Email:</strong> {customer.email}</p>
              <p><strong>Status:</strong> {customer.status}</p>
              <p><strong>Billing Tier:</strong> {customer.billingTier || 'Free'}</p>
            </div>
          ) : (
            <p>No customer data available</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 