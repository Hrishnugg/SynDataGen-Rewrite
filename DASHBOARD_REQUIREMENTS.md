# Dashboard Requirements Document: Synoptic Platform

**Version:** 0.1
**Date:** [Current Date]

## 1. Introduction

This document details the requirements for the main user dashboard of the Synoptic platform. The dashboard serves as the primary landing page for authenticated users, providing a high-level overview of their recent activity and quick access to core functionalities like project management and job submission/monitoring. Its design aims to enhance user productivity by surfacing relevant information and streamlining common workflows.

This dashboard is a critical component of the user experience, bridging the gap between login and detailed project/job management views.

## 2. Goals

*   Provide users with an immediate overview of their most recent projects and data generation jobs.
*   Facilitate quick navigation to key areas of the application (project details, job details, project creation).
*   Offer clear calls to action for initiating core workflows (creating projects, potentially submitting jobs).
*   Establish a consistent and intuitive user interface aligned with the overall platform design (initially Shadcn/ui).
*   Ensure the dashboard is performant and displays up-to-date information efficiently.

## 3. User Stories / Use Cases

*   **US-DASH-01:** As a returning user, I want to see my most recently accessed/created projects on the dashboard so I can quickly jump back into my work.
*   **US-DASH-02:** As a user managing multiple jobs, I want to see the status of my most recent jobs on the dashboard so I can monitor their progress without navigating to each project individually.
*   **US-DASH-03:** As a user starting a new task, I want to quickly initiate the "Create New Project" workflow directly from the dashboard.
*   **US-DASH-04:** As a user, I want the dashboard to load quickly after login so I can start my tasks without delay.
*   **US-DASH-05:** As a user, I want clear links from dashboard items (projects, jobs) to their respective detailed view pages.

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

## 5. Non-Functional Requirements

*   **NFR-DASH-PERF-01:** The dashboard page structure and static elements MUST load in under [TBD, e.g., 500ms].
*   **NFR-DASH-PERF-02:** Dynamic data (projects, jobs) MUST be fetched and displayed within [TBD, e.g., 1 second] after the initial page load, assuming typical network conditions. Loading indicators MUST be shown while data is being fetched.
*   **NFR-DASH-REL-01:** Data displayed on the dashboard (especially job statuses) should reflect the current state accurately. Stale data should be minimized. (Strategy TBD - e.g., refetch on load, potential periodic polling if necessary, or rely on navigation/manual refresh).
*   **NFR-DASH-USA-01:** The dashboard layout MUST be responsive and usable across common screen sizes (desktop, tablet).
*   **NFR-DASH-SEC-01:** All data fetching MUST adhere to user authentication and authorization rules. Users should only see projects and jobs they have permission to access.

## 6. UI/UX Considerations

*   **UI-DASH-LAYOUT-01:** Employ a clear, uncluttered layout, likely using card-based components for distinct sections (Recent Projects, Recent Jobs). Inspiration can be drawn from modern dashboard designs (like the examples provided), but tailored to Synoptic's specific content.
*   **UI-DASH-HIERARCHY-02:** Establish a strong visual hierarchy. Section titles should be prominent. Key information within list items (names, statuses) should be easily scannable.
*   **UI-DASH-CONSISTENCY-03:** Dashboard components MUST use the established UI library (Shadcn/ui initially) and adhere to the overall application's style guide (typography, colors, spacing, iconography) for a consistent look and feel.
*   **UI-DASH-FEEDBACK-04:** Provide clear visual feedback for actions (e.g., button states) and data loading (e.g., skeleton loaders or spinners).
*   **UI-DASH-EMPTY-05:** Empty states (no projects, no jobs) must be handled gracefully, providing informative messages and guiding the user toward relevant actions (as per FR-DASH-PROJ-01, FR-DASH-JOB-01).

## 7. Data Requirements

The dashboard component will require data fetched from the backend API:

*   **Endpoint 1: Get Recent Projects**
    *   Input: Authenticated User context.
    *   Output: A list of project objects, sorted by last modified/accessed date (descending), limited to [N] items. Each object must contain at minimum: `project_id`, `project_name`, `last_modified_timestamp`.
*   **Endpoint 2: Get Recent Jobs**
    *   Input: Authenticated User context.
    *   Output: A list of job objects, sorted by submission date (descending), limited to [M] items. Each object must contain at minimum: `job_id`, `job_name` (or identifier), `project_id`, `project_name`, `status`, `submission_timestamp`.

## 8. Future Considerations

*   User-specific notifications/alerts section.
*   Basic usage statistics (e.g., total projects, running jobs count, storage usage).
*   Quick access to documentation or help resources.
*   Customization options (e.g., choosing default sort order, number of items displayed).
*   Integration of team activity feeds (if/when team features are implemented). 