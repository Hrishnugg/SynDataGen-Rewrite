import { Metadata } from "next";
import { withResolvedParams, ServerPageProps } from "@/lib/page-utils";
import CustomerDetailClientPage from "./client-page";

// Define the params type for this specific page
type CustomerDetailParams = {
  id: string;
};

// Metadata for the page
export const metadata: Metadata = {
  title: "Customer Details",
  description: "View customer details and manage service accounts",
};

// This is an async server component that can handle Promise-based params
export default async function CustomerDetailPage(props: ServerPageProps<CustomerDetailParams>) {
  // Use the withResolvedParams utility to bridge between server and client
  return withResolvedParams(CustomerDetailClientPage, props);
} 