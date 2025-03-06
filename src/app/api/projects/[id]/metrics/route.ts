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
    const mockMetrics = {
      apiCreditsUsed: 15750,
      apiCreditsRemaining: 34250,
      storageUsed: 2048, // in MB
      storageLimit: 10240, // 10 GB in MB
      averageJobDuration: 1260, // in seconds
      totalJobs: 12,
      completedJobs: 8,
      failedJobs: 2,
      lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(), // 6 hours ago
      estimatedRemainingCapacity: 150000 // record count
    };

    return NextResponse.json(mockMetrics);
  } catch (error) {
    console.error("Error fetching metrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch metrics" },
      { status: 500 }
    );
  }
} 