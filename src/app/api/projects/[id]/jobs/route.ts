import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Properly await params according to Next.js 15 requirements
  const { id } = await params;
  const projectId = id;

  try {
    // This would normally come from a database
    // For now, we'll return mock data
    const mockJobs = [
      {
        id: "job-1",
        name: "Product data generation",
        status: "completed",
        progress: 100,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(), // 3 days ago
        completedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2 days ago
        projectId,
        recordCount: 5000
      },
      {
        id: "job-2",
        name: "Customer profiles",
        status: "running",
        progress: 65,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(), // 12 hours ago
        projectId,
        recordCount: 10000
      },
      {
        id: "job-3",
        name: "Transaction history",
        status: "pending",
        progress: 0,
        createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
        projectId,
        recordCount: 25000
      },
      {
        id: "job-4",
        name: "Order dataset",
        status: "failed",
        progress: 34,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
        projectId,
        recordCount: 7500
      }
    ];

    return NextResponse.json({ jobs: mockJobs });
  } catch (error) {
    console.error("Error fetching jobs:", error);
    return NextResponse.json(
      { error: "Failed to fetch jobs" },
      { status: 500 }
    );
  }
} 