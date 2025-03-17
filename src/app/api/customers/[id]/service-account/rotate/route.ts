import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/firebase/auth";
import { getFirebaseFirestore } from "@/lib/firebase/firebase";
import CustomerService from "@/features/customers/services/customers";
import { rotateServiceAccountKey } from "@/lib/api/services/service-accounts";
import { createAuditLog } from "@/lib/api/services/audit-logs";

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
    if (!session?.user || (session.user as any)?.role !== 'admin') {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const customerService = new CustomerService();
    const customer = await customerService.getCustomer(id);
    
    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    // Rotate the service account key
    const result = await rotateServiceAccountKey(id);

    // Create audit log entry
    await createAuditLog({
      action: "SERVICE_ACCOUNT_KEY_ROTATED",
      resource: `customers/${id}`,
      userId: session.user.id || 'system',
      metadata: {
        customerId: id,
        serviceAccountKeyReference: result // result is a string (key reference)
      }
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error rotating service account key:", error);
    return NextResponse.json(
      { error: "Failed to rotate service account key" },
      { status: 500 }
    );
  }
}