# Product Requirements Document: Synoptic Data Generation Platform (Rewrite)

**Version:** 1.0
**Date:** [Current Date]

## 1. Introduction & Goals

### 1.1. Overview
This document outlines the requirements for a complete rewrite of the Synoptic application. The goal is to create a robust, scalable, and maintainable cloud-based platform for generating synthetic data. The rewrite involves separating the frontend and backend into distinct applications, migrating the backend to Golang, and completely overhauling the frontend user interface and experience. **This platform will act as the control plane, interfacing with an existing, separate cloud-deployed data generation pipeline API for job execution.**

### 1.2. Goals

*   **Improve Maintainability & Scalability:** Address technical debt in the original codebase, establish cleaner architecture using Go for the backend and a modern React frontend, enabling easier future development and scaling.
*   **Enhance User Experience:** Deliver a redesigned, intuitive, and efficient user interface for managing synthetic data projects and jobs.
*   **Decouple Frontend & Backend:** Create clear separation via a well-defined REST API, allowing independent development, deployment, and scaling of the frontend and backend.
*   **Core Functionality Parity (Minimum):** Ensure the rewritten platform reliably supports the core synthetic data generation workflow from the original application.
*   **Establish Best Practices:** Implement Test-Driven Development (TDD), clean code principles (SOLID, DRY, KISS), and robust CI/CD pipelines.

### 1.3. Non-Goals

*   Adding significant *new* features beyond the scope of the original application during the initial rewrite phase (focus on rebuild first).
*   Supporting multiple database backends simultaneously (focus on Firestore).
*   Offline functionality.

## 2. Target Audience

*   **Data Scientists & ML Engineers:** Need realistic synthetic data for training models, testing pipelines, or sharing data without privacy concerns.
*   **Software Developers & QA Engineers:** Require structured synthetic data for application development, testing, and seeding databases.
*   **Teams Collaborating on Data Projects:** Need shared environments to manage data generation tasks and results.

## 3. Use Cases

*   **UC-1: User Registration & Login:** A new user registers for an account, verifies their email (if applicable), and logs into the platform.
*   **UC-2: Project Creation & Management:** A logged-in user creates a new data generation project, assigns it a name and description, and views their list of existing projects.
*   **UC-3: Job Configuration & Submission:** A user selects a project, configures the parameters for a new synthetic data generation job (data type, record count, schema, output format, etc.), and submits the job for processing.
*   **UC-4: Job Monitoring & Results:** A user monitors the status and progress of submitted jobs, views metrics upon completion/failure, and accesses the generated data output.
*   **UC-5: Data Viewing:** A user utilizes the built-in data viewer tool to inspect generated datasets (e.g., CSV, tabular).
*   **UC-6: Data Interaction (Chat):** A user asks questions about a viewed dataset using the integrated chat interface.
*   **UC-7: Team Collaboration (Future):** A project owner invites team members to a project, assigns roles (e.g., viewer, member, admin), and manages team access.
*   **UC-8: User Settings Management:** A user updates their profile information (name, company) and potentially manages notification or security settings.

## 4. Functional Requirements

### 4.1. User Authentication & Management (Backend-Managed)
*   **FR-AUTH-01:** Users must be able to register for a new account using name, email, password, and company name.
*   **FR-AUTH-02:** The system must securely hash and store user passwords.
*   **FR-AUTH-03:** Users must be able to log in using their email and password.
*   **FR-AUTH-04:** The backend must generate and manage user sessions (via secure cookies or JWTs) upon successful login.
*   **FR-AUTH-05:** The system must provide an endpoint for users to log out, invalidating their current session.
*   **FR-AUTH-06:** The system must provide an endpoint for authenticated users to retrieve their own user profile information (excluding sensitive data like password hash).
*   **FR-AUTH-07:** API endpoints requiring authentication must reject requests without valid session credentials.

### 4.2. Project Management
*   **FR-PROJ-01:** Authenticated users must be able to create new projects with a name, description, and initial settings (e.g., data retention, storage quota).
*   **FR-PROJ-02:** Creating a project must automatically provision necessary backend resources (e.g., a dedicated GCS bucket).
*   **FR-PROJ-03:** Users must be able to view a list of projects they own or are members of.
*   **FR-PROJ-04:** Users must be able to view the details of a specific project they have access to.
*   **FR-PROJ-05:** Users with appropriate permissions (e.g., owner, admin) must be able to update project details (name, description, settings).
*   **FR-PROJ-06:** Users with appropriate permissions (e.g., owner) must be able to archive or delete a project.
*   **FR-PROJ-07:** Deleting/Archiving a project should handle associated resources (e.g., delete/archive jobs, potentially delete GCS bucket based on policy).

### 4.3. Team Collaboration (*Note: API endpoints TBD*)
*   **FR-TEAM-01:** Users with appropriate permissions (e.g., owner, admin) should be able to invite other registered users to a project via email.
*   **FR-TEAM-02:** Invited users should be able to accept or decline project invitations.
*   **FR-TEAM-03:** Users with appropriate permissions should be able to assign roles (e.g., owner, admin, member, viewer) to team members.
*   **FR-TEAM-04:** Users with appropriate permissions should be able to remove members from a project.
*   **FR-TEAM-05:** Project access control must be enforced based on team membership and roles.

### 4.4. Job Management
*   **FR-JOB-01:** Users must be able to create/configure a new data generation job within a specific project.
*   **FR-JOB-02:** Job configuration must include parameters like data type, record count, output format, quality level, and schema definition (*Note: Specific parameters depend on generation capabilities*).
*   **FR-JOB-03:** Users must be able to submit a configured job. **The backend must securely communicate with the existing external data generation pipeline API to initiate processing.**
*   **FR-JOB-04:** Users must be able to view a list of jobs associated with a project, including their status and basic details. **Status should reflect information potentially retrieved from the pipeline API.**
*   **FR-JOB-05:** Users must be able to view the detailed status and progress of a specific job (including stage progress if applicable). **Progress information may be polled from or pushed by the pipeline API.**
*   **FR-JOB-06:** Users must be able to view logs or error messages associated with failed jobs, **potentially retrieved from the pipeline API.**
*   **FR-JOB-07:** Users must be able to request cancellation of a queued or running job. **The backend must communicate this request to the external pipeline API.**
*   **FR-JOB-08:** Users must be able to access/download the output data of completed jobs (stored in GCS).
*   **FR-JOB-09:** The system should support rate limiting for job creation/execution.
*   **FR-JOB-10:** The system should support data retention policies for job outputs.
*   **FR-JOB-11:** The backend service must securely authenticate and interact with the external data generation pipeline API.

### 4.5. Data Handling & Interaction
*   **FR-DATA-01:** The platform must store input data (if applicable) and output data associated with projects/jobs securely (e.g., in project-specific GCS buckets).
*   **FR-DATA-02:** Users must be able to view generated datasets (tabular, CSV initially) using a built-in data viewer component.
*   **FR-DATA-03:** The data viewer should support basic exploration features (e.g., pagination, potentially sorting/filtering).
*   **FR-DATA-04:** Users must be able to interact with viewed data via an integrated chat interface to ask questions about it (*Note: Scope and capabilities of chat TBD*).

## 5. Non-Functional Requirements

*   **NFR-01 (Performance):** API response times should generally be under 500ms for typical requests. Job submission should be near-instantaneous (actual processing time depends on the backend pipeline).
*   **NFR-02 (Scalability):** Both frontend and backend should be designed to scale horizontally. Backend deployment on GKE and use of Firestore/GCS support this.
*   **NFR-03 (Maintainability):** Codebase must follow clean code principles, be well-documented (especially the API), and have high test coverage.
*   **NFR-04 (Reliability):** The system should handle errors gracefully. Job processing failures should be logged and reported clearly to the user.
*   **NFR-05 (Security):** Implement secure authentication, proper authorization checks for all operations, input validation, and protection against common web vulnerabilities (OWASP Top 10).
*   **NFR-06 (Usability):** The redesigned frontend must be intuitive, responsive, and provide clear feedback to the user.

## 6. Design & UX Considerations

*   The frontend will undergo a complete visual and UX redesign.
*   Initial implementation will use Shadcn/ui components.
*   The target UI library is Aceternity UI, which will be integrated once licensing/payment is resolved.
*   The UI should provide clear status indication for asynchronous operations (job processing).

## 7. API Specification

*   Communication between frontend and backend will occur via a REST API.
*   The API contract is defined in the `openapi.yaml` specification document.

## 8. Release Criteria (MVP)

The initial release (MVP) of the rewritten platform should include:

*   Functional User Registration & Login.
*   Core Project CRUD operations (Create, List, View, Update basic settings, Archive/Delete).
*   Ability to configure and submit a basic data generation job type.
*   Ability to view the status (Queued, Running, Completed, Failed) and basic details of submitted jobs.
*   Ability to access/download the output of a completed job.
*   Deployment of backend (GKE) and frontend (Vercel).

## 9. Future Considerations

*   Detailed Team Collaboration features (invites, roles).
*   Advanced Job Management (pause/resume, detailed metrics, more output formats).
*   Full implementation of the Data Viewer chat interface.
*   Admin dashboard features (customer management, system monitoring).
*   Webhook support for job status changes.
*   Integration with external monitoring/alerting (Cloud Monitoring).
*   More sophisticated cost tracking/estimation. 