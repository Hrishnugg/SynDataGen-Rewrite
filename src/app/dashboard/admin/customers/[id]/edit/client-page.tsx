"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CustomerForm } from "@/features/customers/components/CustomerForm";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ClientPageProps } from "@/lib/utils/page-utils";

// Define the params type for this specific page
type CustomerEditParams = {
  id: string;
};

// Use the ClientPageProps type to ensure type safety
export default function EditCustomerClientPage({ params }: ClientPageProps<CustomerEditParams>) {
  const router = useRouter();
  const { id } = params;
  
  const [customerData, setCustomerData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch customer data
  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        setLoading(true);
        
        // In a real implementation, this would be an API call
        // For now, we'll simulate the data
        setTimeout(() => {
          // This is just sample data - in a real app, you would fetch this from your API
          const sampleData = {
            name: "Acme Corporation",
            email: "info@acmecorp.com",
            status: "active",
            billingTier: "pro",
            notes: "Key customer with multiple service accounts",
            contactName: "John Doe",
            contactEmail: "john@acmecorp.com",
            contactPhone: "+1 (555) 123-4567",
            address: "123 Main St, San Francisco, CA 94105",
            settings: {
              storageQuota: 500,
              maxProjects: 10
            }
          };
          
          setCustomerData(sampleData);
          setLoading(false);
        }, 1000);
      } catch (err) {
        setError("Failed to load customer data");
        setLoading(false);
        toast.error("Failed to load customer data");
      }
    };

    fetchCustomer();
  }, [id]);

  const handleSubmit = async (data: any) => {
    try {
      // Simulate API call
      toast.promise(
        new Promise(resolve => setTimeout(resolve, 1500)),
        {
          loading: "Updating customer...",
          success: "Customer updated successfully",
          error: "Failed to update customer"
        }
      );
      
      // After successful update, redirect back to customer details
      setTimeout(() => {
        router.push(`/dashboard/admin/customers/${id}`);
      }, 1500);
    } catch (err) {
      toast.error("Failed to update customer");
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Edit Customer</h1>
      <Card>
        <CardContent className="p-6">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-2/3" />
            </div>
          ) : error ? (
            <div className="text-center p-4">
              <p className="text-red-600">{error}</p>
              <button 
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md"
                onClick={() => window.location.reload()}
              >
                Retry
              </button>
            </div>
          ) : (
            <CustomerForm 
              initialData={customerData} 
              onSubmit={handleSubmit}
              mode="edit"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
} 