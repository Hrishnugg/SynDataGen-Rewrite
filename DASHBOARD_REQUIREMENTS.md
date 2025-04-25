# Dashboard Requirements Document: Synoptic Platform

**Version:** 0.1
**Date:** [Current Date]

## 1. Introduction

This document details the requirements for the main user dashboard of the Synoptic platform. The dashboard serves as the primary landing page for authenticated users, providing a high-level overview of their recent activity and quick access to core functionalities like project management and job submission/monitoring. Its design aims to enhance user productivity by surfacing relevant information and streamlining common workflows.

This dashboard is a critical component of the user experience, bridging the gap between login and detailed project/job management views.

## 2. Goals

*   Provide users with an immediate overview of their most recent projects and data generation jobs.
*   Facilitate quick navigation to key areas of the application (project details, job details, project creation, analytics).
*   Offer clear calls to action for initiating core workflows (creating projects, potentially submitting jobs).
*   Provide users with insights into their data generation usage, costs, and job performance through a dedicated analytics view.
*   Establish a consistent and intuitive user interface aligned with the overall platform design (initially Shadcn/ui).
*   Ensure the dashboard and analytics views are performant and display up-to-date information efficiently.

## 3. User Stories / Use Cases

*   **US-DASH-01:** As a returning user, I want to see my most recently accessed/created projects on the dashboard so I can quickly jump back into my work.
*   **US-DASH-02:** As a user managing multiple jobs, I want to see the status of my most recent jobs on the dashboard so I can monitor their progress without navigating to each project individually.
*   **US-DASH-03:** As a user starting a new task, I want to quickly initiate the "Create New Project" workflow directly from the dashboard.
*   **US-DASH-04:** As a user, I want the dashboard to load quickly after login so I can start my tasks without delay.
*   **US-DASH-05:** As a user, I want clear links from dashboard items (projects, jobs) to their respective detailed view pages.
*   **US-ANALYSIS-01:** As a user, I want to view aggregated metrics like total records generated, total jobs run, and total estimated cost across all my projects so I can understand my overall usage.
*   **US-ANALYSIS-02:** As a user, I want to see metrics broken down per project (e.g., records generated, jobs run, cost per project) so I can identify which projects are consuming the most resources.
*   **US-ANALYSIS-03:** As a user, I want to view metrics for individual jobs (e.g., generation time, records generated, cost per job) so I can analyze the performance and cost-effectiveness of specific generation tasks.

## 4. Functional Requirements

### 4.1. Data Display

*   **FR-DASH-PROJ-01:** The dashboard MUST display a section titled "Recent Projects".
    *   This section MUST list the user's [N=5, TBD] most recently accessed or created projects.
    *   For each project listed, the dashboard MUST display:
        *   Project Name
        *   Date of last modification or access (TBD based on available data)
    *   Each listed project MUST be a clickable link navigating the user to that specific project's detail page (`/projects/{project_id}`).
    *   If the user has fewer than [N] projects, all their projects should be displayed.
    *   If the user has no projects, a clear message indicating this state and a prompt to create one (linking to FR-DASH-ACT-01) MUST be displayed.
*   **FR-DASH-JOB-01:** The dashboard MUST display a section titled "Recent Jobs".
    *   This section MUST list the user's [M=5, TBD] most recently submitted jobs across all their accessible projects.
    *   For each job listed, the dashboard MUST display:
        *   Job Name or ID (TBD)
        *   Associated Project Name
        *   Current Job Status (e.g., Queued, Running, Completed, Failed, Cancelled) - Status should be visually distinct (e.g., using badges/colors).
        *   Job Submission Timestamp
    *   Each listed job MUST be a clickable link navigating the user to that specific job's detail page (`/projects/{project_id}/jobs/{job_id}`).
    *   If the user has fewer than [M] jobs, all their recent jobs should be displayed.
    *   If the user has no jobs, a clear message indicating this state MUST be displayed.

### 4.2. Actions & Navigation

*   **FR-DASH-ACT-01:** The dashboard MUST provide a clearly visible "Create New Project" button or link.
    *   Clicking this action MUST navigate the user to the project creation form/page.
*   **FR-DASH-ACT-02:** (Optional - Post-MVP Consideration?) Consider adding a "Submit New Job" button.
    *   *Design Decision:* Determine if this action should navigate to a general job submission page (requiring project selection) or if it's better initiated from within a project context. For MVP, initiating from the dashboard might add complexity; leaning towards requiring project context first.
*   **FR-DASH-NAV-01:** The dashboard MUST be integrated into the main application navigation structure (e.g., accessible via a "Dashboard" or "Overview" link in a sidebar/header).
*   **FR-DASH-NAV-02:** Links within the dashboard components (Recent Projects, Recent Jobs) MUST correctly route the user to the specific detail pages as defined in FR-DASH-PROJ-01 and FR-DASH-JOB-01.

### 4.3. Analytics Page Requirements

*   **FR-ANALYSIS-NAV-01:** The application MUST provide navigation to a dedicated "Analytics" page, accessible from the main navigation (e.g., sidebar).
*   **FR-ANALYSIS-METRICS-01:** The Analytics page MUST display aggregate metrics for the user's account over a selectable time period (e.g., last 7 days, last 30 days, all time - TBD). Aggregate metrics MUST include:
    *   Total number of data records generated.
    *   Total time spent generating data (cumulative job run times).
    *   Total number of jobs executed (sum of Completed, Failed statuses).
    *   Total estimated cost (requires cost model integration - TBD).
*   **FR-ANALYSIS-METRICS-02:** The Analytics page MUST display a breakdown of key metrics per project. This could be presented in a table or chart format and MUST include (for each project, within the selected time period):
    *   Project Name (linking to the project page).
    *   Number of records generated for the project.
    *   Number of jobs run for the project.
    *   Estimated cost attributed to the project.
*   **FR-ANALYSIS-METRICS-03:** The Analytics page MAY provide a view or table listing individual job metrics (potentially filterable or searchable, possibly linking to job detail pages). Metrics per job should include:
    *   Job Name/ID.
    *   Associated Project Name.
    *   Status.
    *   Start/End Timestamps or Duration.
    *   Number of records generated.
    *   Estimated cost of the job.
*   **FR-ANALYSIS-FILTER-01:** The Analytics page SHOULD allow users to filter the displayed data by date range (predefined ranges like "Last 30 days" and potentially a custom range selector).

## 5. Non-Functional Requirements

*   **NFR-DASH-PERF-01:** The dashboard page structure and static elements MUST load in under [TBD, e.g., 500ms].
*   **NFR-DASH-PERF-02:** Dynamic data (projects, jobs) on the dashboard MUST be fetched and displayed within [TBD, e.g., 1 second] after the initial page load, assuming typical network conditions. Loading indicators MUST be shown while data is being fetched.
*   **NFR-ANALYSIS-PERF-01:** Analytics data calculation and retrieval MUST be performant. Aggregate queries should execute within [TBD, e.g., 2-3 seconds] even with a large number of projects/jobs. Consider pre-calculation or indexing strategies if needed.
*   **NFR-ANALYSIS-ACCURACY-01:** Cost estimations displayed in the analytics section MUST be clearly labeled as estimates and based on a documented cost model.
*   **NFR-DASH-REL-01:** Data displayed on the dashboard (especially job statuses) should reflect the current state accurately. Stale data should be minimized. (Strategy TBD - e.g., refetch on load, potential periodic polling if necessary, or rely on navigation/manual refresh).
*   **NFR-ANALYSIS-REL-01:** Analytics data MAY be slightly delayed compared to real-time operational data (e.g., updated hourly or daily), depending on the calculation strategy. This trade-off should be documented.
*   **NFR-DASH-USA-01:** The dashboard and analytics pages MUST be responsive and usable across common screen sizes (desktop, tablet).
*   **NFR-DASH-SEC-01:** All data fetching (dashboard and analytics) MUST adhere to user authentication and authorization rules. Users should only see data for projects and jobs they have permission to access.

## 6. UI/UX Considerations

*   **UI-DASH-LAYOUT-01:** Employ a clear, uncluttered layout, likely using card-based components for distinct sections (Recent Projects, Recent Jobs on dashboard). Inspiration can be drawn from modern dashboard designs (like the examples provided), but tailored to Synoptic's specific content.
*   **UI-ANALYSIS-LAYOUT-01:** The Analytics page should present data clearly, potentially using a mix of summary statistics (cards), charts (for trends or comparisons), and tables (for detailed breakdowns like per-project or per-job metrics).
*   **UI-DASH-HIERARCHY-02:** Establish a strong visual hierarchy. Section titles should be prominent. Key information within list items (names, statuses) should be easily scannable.
*   **UI-CONSISTENCY-03:** Dashboard and Analytics components MUST use the established UI library (Shadcn/ui initially) and adhere to the overall application's style guide (typography, colors, spacing, iconography) for a consistent look and feel.
*   **UI-FEEDBACK-04:** Provide clear visual feedback for actions (e.g., button states), data loading (e.g., skeleton loaders or spinners), and filtering on both dashboard and analytics pages.
*   **UI-DASH-EMPTY-05:** Empty states (no projects, no jobs on dashboard; no data for selected period on analytics) must be handled gracefully, providing informative messages and guiding the user toward relevant actions or adjustments (like changing filters).
*   **UI-ANALYSIS-COST-01:** Clearly indicate that cost figures are estimates. Provide context or link to documentation explaining the cost model if possible.

## 7. Data Requirements

The dashboard and analytics components will require data fetched from the backend API:

*   **Endpoint 1: Get Recent Projects (Dashboard)**
    *   Input: Authenticated User context.
    *   Output: A list of project objects, sorted by last modified/accessed date (descending), limited to [N] items. Each object must contain at minimum: `project_id`, `project_name`, `last_modified_timestamp`.
*   **Endpoint 2: Get Recent Jobs (Dashboard)**
    *   Input: Authenticated User context.
    *   Output: A list of job objects, sorted by submission date (descending), limited to [M] items. Each object must contain at minimum: `job_id`, `job_name` (or identifier), `project_id`, `project_name`, `status`, `submission_timestamp`.
*   **Endpoint 3: Get Aggregate Analytics (Analytics Page)**
    *   Input: Authenticated User context, Time Period Filter (e.g., `?period=30d`).
    *   Output: An object containing aggregate metrics: `total_records_generated`, `total_generation_time_ms`, `total_jobs_run`, `total_estimated_cost`.
*   **Endpoint 4: Get Per-Project Analytics (Analytics Page)**
    *   Input: Authenticated User context, Time Period Filter.
    *   Output: A list of objects, one per project accessible by the user. Each object should contain: `project_id`, `project_name`, `records_generated`, `jobs_run`, `estimated_cost`. (Should support pagination/sorting if the list can be long).
*   **Endpoint 5: Get Per-Job Analytics (Analytics Page - Optional/Detailed View)**
    *   Input: Authenticated User context, Time Period Filter, potentially Project Filter, Pagination parameters.
    *   Output: A list of job objects with detailed metrics: `job_id`, `job_name`, `project_id`, `project_name`, `status`, `start_time`, `end_time`, `duration_ms`, `records_generated`, `estimated_cost`.

## 8. Future Considerations

*   User-specific notifications/alerts section.
*   Basic usage statistics (e.g., total projects, running jobs count, storage usage).
*   Quick access to documentation or help resources.
*   Customization options (e.g., choosing default sort order, number of items displayed).
*   Integration of team activity feeds (if/when team features are implemented). 