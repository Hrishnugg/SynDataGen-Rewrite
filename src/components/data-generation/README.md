# Data Generation UI Components

This directory contains the UI components for the data generation system.

## Component Structure

### Job Management Components

Located in `src/components/data-generation/job-management/`

- **JobCreationForm**: A multi-step wizard for creating new data generation jobs
  - Step 1: Basic configuration (data type, size, format)
  - Step 2: Storage configuration (input/output buckets and paths)
  - Step 3: Advanced options (async processing, timeout, resume window)
  - Step 4: Review and submit

- **JobStatusCard**: A card component for displaying the status of a job
  - Status indicator with color coding
  - Progress bar
  - Basic metadata
  - Action buttons (cancel, resume)

- **JobDetailsPanel**: A detailed view of a job's status and configuration
  - Full job configuration
  - Stage progress timeline
  - Detailed metrics
  - Log viewer
  - Action buttons

- **JobHistoryTable**: A data table for viewing job history
  - Filtering by status, date range
  - Sorting by various fields
  - Pagination
  - Action buttons
  - Export functionality

### Data Viewer Components

Located in `src/components/data-generation/data-viewer/`

- **DataTable**: An Excel/Sheets-like component for viewing tabular data
  - Column resizing and reordering
  - Data type detection and formatting
  - Pagination
  - Search and filter
  - Export functionality

- **DataPreview**: A lightweight preview of data
  - Basic table view
  - Limited to first N rows
  - Quick summary stats

- **DataDownloadButton**: A button for downloading data in various formats
  - Format selection (CSV, JSON, Parquet)
  - File name customization
  - Progress indicator during download

### Dashboard Components

Located in `src/components/data-generation/dashboard/`

- **JobSummaryStats**: A component showing summary statistics for jobs
  - Total jobs by status
  - Success/failure rates
  - Average processing time
  - Data volume metrics

- **RateLimitIndicator**: A component showing current rate limit usage
  - Visual indicator of used vs. available slots
  - Cooldown job indicators
  - Warnings when approaching limits

- **RecentJobsTimeline**: A timeline view of recent jobs
  - Status transitions
  - Duration visualization
  - Error highlighting

- **StorageUsageChart**: A chart showing storage usage
  - Usage by bucket
  - Trends over time
  - Quota indicators

## Pages

Located in `src/app/dashboard/data-generation/`

- **page.tsx**: Main data generation dashboard page
  - Overview of jobs
  - Quick access to create new jobs
  - Summary statistics

- **jobs/page.tsx**: Job management page
  - Job history table
  - Filtering and sorting options
  - Bulk actions

- **jobs/[jobId]/page.tsx**: Job details page
  - Detailed view of a specific job
  - Status tracking
  - Actions (cancel, resume)
  - Data preview/download

- **create/page.tsx**: Job creation page
  - Step-by-step wizard
  - Input validation
  - Configuration preview

## Implementation Plan

1. **Basic Components**
   - Implement JobStatusCard
   - Implement JobHistoryTable
   - Implement basic DataTable
   - Implement JobSummaryStats

2. **Page Layouts**
   - Create basic layouts for all pages
   - Implement navigation between pages
   - Set up authentication guards

3. **Job Creation Flow**
   - Implement JobCreationForm
   - Connect to API endpoints
   - Add validation and error handling

4. **Job Monitoring**
   - Implement JobDetailsPanel
   - Add real-time updates via WebSockets
   - Implement status transitions and progress tracking

5. **Data Viewing**
   - Enhance DataTable with advanced features
   - Implement DataDownloadButton
   - Add format conversion options

6. **Dashboard Enhancements**
   - Add RateLimitIndicator
   - Implement RecentJobsTimeline
   - Add StorageUsageChart
   - Enhance with filtering and customization options 