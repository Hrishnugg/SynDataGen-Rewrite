"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CustomerForm } from "@/components/customers/CustomerForm";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/skeleton";

interface CustomerPageProps {
  params: {
    id: string;
  };
}

export default function EditCustomerPage({ params }: CustomerPageProps) {
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
            contactEmail: "john.doe@acmecorp.com",
            contactPhone: "+1 (555) 123-4567",
            projectId: "acme-corp-project",
            location: "us-central1",
            allowedDatasets: "transactions, products, customers"
          };
          
          setCustomerData(sampleData);
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error("Error fetching customer:", error);
        setError("Failed to load customer data. Please try again.");
        setLoading(false);
        toast.error("Failed to load customer data");
      }
    };
    
    fetchCustomer();
  }, [id]);

  // Handle the form submission
  const handleUpdateCustomer = async (data: any) => {
    // In a real implementation, this would be an API call
    console.log("Updating customer with data:", data);
    
    // Simulate an API call with a timeout
    return new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        try {
          // If the API call is successful
          toast.success("Customer updated successfully");
          router.push(`/dashboard/admin/customers/${id}`);
          resolve();
        } catch (error) {
          // If the API call fails
          console.error("Error updating customer:", error);
          reject(error);
        }
      }, 1000);
    });
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-6">
        <Skeleton className="h-8 w-64 mb-6" />
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-6 w-full mb-4" />
            <Skeleton className="h-6 w-full mb-4" />
            <Skeleton className="h-6 w-full mb-4" />
            <Skeleton className="h-6 w-full mb-4" />
            <Skeleton className="h-6 w-full mb-4" />
            <Skeleton className="h-6 w-full mb-4" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-6">
        <h1 className="text-2xl font-bold mb-6">Error</h1>
        <Card>
          <CardContent className="pt-6">
            <p className="text-red-500">{error}</p>
            <button 
              onClick={() => router.push("/dashboard/admin/customers")}
              className="mt-4 px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200 transition"
            >
              Return to Customers
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Edit Customer: {customerData?.name}</h1>
      <CustomerForm 
        initialData={customerData} 
        isEditing={true}
        onSubmit={handleUpdateCustomer} 
      />
    </div>
  );
} 