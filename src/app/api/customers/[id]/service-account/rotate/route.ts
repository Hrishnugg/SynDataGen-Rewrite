import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/firebase";
import { getCustomerById } from "@/lib/customers";
import { rotateServiceAccountKey } from "@/lib/service-accounts";
import { createAuditLog } from "@/lib/audit-logs";

// Define the params type as a Promise
type IdParams = Promise<{ id: string }>;

/**
 * POST - Rotate the key for a customer's service account
 */
export async function POST(
  request: NextRequest,
  { params }: { params: IdParams }
) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 401 }
      );
    }

    if (session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Admin permissions required" },
        { status: 403 }
      );
    }

    // Await the params to get the ID
    const { id: customerId } = await params;
    if (!customerId) {
      return NextResponse.json(
        { error: "Customer ID is required" },
        { status: 400 }
      );
    }

    // Get customer from Firestore
    const customer = await getCustomerById(customerId);
    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    // Check if customer has a service account
    if (!customer.serviceAccount) {
      return NextResponse.json(
        { error: "No service account found for this customer" },
        { status: 404 }
      );
    }

    // Rotate the service account key
    const newKeyReference = await rotateServiceAccountKey(customer.serviceAccount.email);

    // Update customer record with new key reference
    const customerRef = db.collection("customers").doc(customerId);
    await customerRef.update({
      "serviceAccount.keyReference": newKeyReference,
      "serviceAccount.lastRotated": new Date().toISOString(),
    });

    // Create audit log
    await createAuditLog({
      action: "service_account_key_rotated",
      resource: `customers/${customerId}/service-account`,
      userId: session.user.id,
      metadata: {
        customerName: customer.name,
        serviceAccountEmail: customer.serviceAccount.email,
      },
    });

    return NextResponse.json(
      { 
        message: "Service account key rotated successfully",
        keyReference: newKeyReference,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error rotating service account key:", error);
    return NextResponse.json(
      { error: "Failed to rotate service account key" },
      { status: 500 }
    );
  }
} 