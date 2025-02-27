"use client";

import { useRouter } from "next/navigation";
import { CustomerForm } from "@/components/customers/CustomerForm";
import { toast } from "sonner";

export default function NewCustomerPage() {
  const router = useRouter();

  // Handle the form submission
  const handleCreateCustomer = async (data: any) => {
    // In a real implementation, this would be an API call
    console.log("Creating customer with data:", data);
    
    // Simulate an API call with a timeout
    return new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        // Simulate success (you would replace this with an actual API call)
        try {
          // If the API call is successful
          toast.success("Customer created successfully");
          router.push("/dashboard/admin/customers");
          resolve();
        } catch (error) {
          // If the API call fails
          console.error("Error creating customer:", error);
          reject(error);
        }
      }, 1000);
    });
  };

  return (
    <div className="max-w-4xl mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Create New Customer</h1>
      <CustomerForm onSubmit={handleCreateCustomer} />
    </div>
  );
} 