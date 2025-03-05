import { Metadata } from "next";
import { withResolvedParams, ServerPageProps } from "@/lib/page-utils";
import EditCustomerClientPage from "./client-page";

// Define the params type for this specific page
type CustomerEditParams = {
  id: string;
};

// Metadata for the page
export const metadata: Metadata = {
  title: "Edit Customer",
  description: "Edit customer details",
};

// This is an async server component that can handle Promise-based params
export default async function EditCustomerPage(props: ServerPageProps<CustomerEditParams>) {
  // Use the withResolvedParams utility to bridge between server and client
  return withResolvedParams(EditCustomerClientPage, props);
} 