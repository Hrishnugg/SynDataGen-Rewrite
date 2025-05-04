# Backend-Frontend Integration Plan

This document outlines the analysis of the backend services and the plan for integrating frontend components.

## Backend Analysis

The backend is structured into several key modules:

*   **`cmd/api/`**: API server entry point. (Analysis Complete)
    *   **Summary:** Contains `main.go` which initializes all platform components (Firestore, GCS Storage, Logger, Stub Pipeline), repositories, and services (`auth`, `project`, `job`). Sets up the Gin router, registers middleware (logging, recovery, auth), defines API routes under `/api/v1`, and starts the HTTP server.
    *   **Key Files:** `main.go`.
    *   **Confirmed API Routes (`/api/v1` base path):**
        *   `GET /health`
        *   Auth: `POST /auth/register`, `POST /auth/login`, `GET /auth/session` (Auth), `POST /auth/logout` (Auth)
        *   Projects: `POST /projects` (Auth), `GET /projects` (Auth), `GET /projects/:projectId` (Auth), `PATCH /projects/:projectId` (Auth, Admin+), `DELETE /projects/:projectId` (Auth, Owner)
        *   Team: `POST /projects/:projectId/team` (Auth, Admin+), `PUT /projects/:projectId/team/:memberId` (Auth, Admin+), `DELETE /projects/:projectId/team/:memberId` (Auth, Admin+/Self)
        *   Jobs: `POST /projects/:projectId/jobs` (Auth, Member+), `GET /projects/:projectId/jobs` (Auth, Viewer+), `GET /jobs/:jobId` (Auth, Viewer+), `DELETE /jobs/:jobId` (Auth, Member+) -> Cancel Job
        *   *(Job Submit/Sync endpoints still missing from router)*
*   **`internal/`**: Core logic modules.
    *   **`auth/`**: Authentication and authorization. (Analysis Complete)
        *   **Summary:** Handles user registration, login, current user retrieval, and logout using **HttpOnly session cookies containing JWTs**. Depends on `core.UserRepository`. Passwords hashed with bcrypt.
        *   **Key Files:** `service.go` (interface), `auth_service.go` (implementation), `handlers.go` (HTTP layer), `middleware.go` (Cookie JWT validation).
        *   **Data Structures:**
            *   `RegisterRequest{ Name, Email, Password, Company }`
            *   `LoginRequest{ Email, Password }`
            *   `LoginResponse{ User(*core.User), Token(string) }`
            *   `core.User{ ID, Name, Email, Company, CreatedAt, UpdatedAt }` (Password hash stored but not returned)
        *   **API Endpoints (Tentative Paths):**
            *   `POST /auth/register`: Creates a new user.
            *   `POST /auth/login`: Authenticates user, returns user info and JWT.
            *   `GET /auth/me` (Authenticated): Returns current user info based on JWT.
            *   `POST /auth/logout` (Authenticated): Server-side acknowledgement (client discards token).
        *   **Middleware:** JWT validation (checks signature, expiry), extracts user ID into request context.
    *   **`core/`**: Core business logic/utilities. (Analysis Complete)
        *   **Summary:** Defines core data models (`User`, `Project`, `Job`) and repository interfaces (`UserRepository`, `ProjectRepository`, `JobRepository`, `StorageService`) used across the backend. Acts as the central definition for data entities and access patterns.
        *   **Key Files:** `user.go`, `project.go`, `job.go`, `repository.go`.
        *   **Data Structures:**
            *   `User{ ID, Name, Email, Company, Password(hash), CreatedAt, UpdatedAt }`
            *   `Project` (Details TBD in `project` analysis)
            *   `Job` (Details TBD in `job` analysis)
        *   **Repository Interfaces:**
            *   `UserRepository{ GetUserByEmail, CreateUser, GetUserByID }`
            *   `ProjectRepository` (Details TBD in `project` analysis)
            *   `JobRepository` (Implemented in `platform/firestore/job_repository.go`)
            *   `StorageService` (Implemented in `platform/storage/gcp_storage.go`)
    *   **`job/`**: Background job processing. (Analysis Complete)
        *   **Summary:** Manages the lifecycle of data generation jobs (create, submit, track status, cancel, list). Integrates with an external pipeline via `PipelineClient`. Uses `project.ProjectService` for role-based access control (Viewer, Member) on a per-project basis.
        *   **Key Files:** `service.go` (logic), `handlers.go` (API), `pipeline.go` (external pipeline interface).
        *   **Dependencies:** `core.JobRepository`, `project.ProjectService` (for auth), `job.PipelineClient` (Implemented in `platform/pipeline/stub_client.go` - STUB ONLY).
        *   **Data Structures:**
            *   `core.Job` (Defined in `core/job.go`, likely has ID, ProjectID, UserID, Status, Type, Config, PipelineJobID, ResultURI, Timestamps)
            *   `CreateJobRequest{ ProjectID, JobType, JobConfig }`
            *   `core.JobStatus` (Enum: Pending, Running, Completed, Failed, Cancelled)
            *   *(Note: `openapi.yaml` defines richer Job structures: `JobConfiguration`, `JobProgress`, `JobError`)*
        *   **API Endpoints (Registered in `handlers.go`):**
            *   `POST /api/v1/projects/:projectId/jobs` (Auth, Member Role): Create job.
            *   `GET /api/v1/projects/:projectId/jobs` (Auth, Viewer Role): List jobs (paginated).
            *   `GET /api/v1/jobs/:jobId` (Auth, Viewer Role): Get job details.
            *   *(Service layer supports Submit, Cancel, SyncStatus - endpoints likely needed)*
        *   **Authorization:** Delegates to `project.ProjectService` to check user's role (`Viewer`, `Member`) on the job's parent project.
    *   **`platform/`**: Infrastructure (database, logging, storage, etc.). (Analysis Complete)
        *   **Summary:** Provides concrete implementations for infrastructure interactions defined by interfaces in `core` and `job`.
        *   **Components:**
            *   `firestore/`: Implements `UserRepository`, `ProjectRepository`, `JobRepository` using Google Cloud Firestore.
            *   `logger/`: Sets up a global `zap.Logger` (dev config default).
            *   `pipeline/`: Contains `stubPipelineClient` implementing `job.PipelineClient` for dev/testing. **Production implementation required.**
            *   `storage/`: Implements `core.StorageService` using Google Cloud Storage (GCS) via `gcp_storage.go`. Handles bucket CRUD (naming: `synoptic-project-<id>`, labels, uniform access).
    *   **`project/`**: Project management logic. (Analysis Complete)
        *   **Summary:** Manages project lifecycle (CRUD) and team membership/roles. Integrates with `core.StorageService` to provision/deprovision project-specific buckets. Implements Role-Based Access Control (RBAC) based on `core.Role` (Owner, Admin, Member, Viewer) within the `TeamMembers` map of a project. This service is used by other modules (like `job`) for authorization checks.
        *   **Key Files:** `service.go` (logic, auth checks), `handlers.go` (API).
        *   **Dependencies:** `core.ProjectRepository`, `core.UserRepository`, `core.StorageService`.
        *   **Data Structures:**
            *   `core.Project` (Defined in `core/project.go`, likely has ID, Name, Desc, Status, Settings, Storage{Bucket, Region, URI}, TeamMembers{UserID: Role}, Timestamps)
            *   `core.Role` (Enum: Owner, Admin, Member, Viewer)
            *   `CreateProjectRequest{ Name, Description, Settings }`
            *   `UpdateProjectRequest{ Name*, Description*, Settings*, Status* }` (*=optional for PATCH)
            *   `ListProjectsResponse{ Projects[], Total, Limit, Offset }`
            *   `InviteMemberRequest{ UserID, Role (Admin|Member|Viewer) }`
            *   `UpdateMemberRoleRequest{ Role (Admin|Member|Viewer) }`
        *   **API Endpoints (All Authenticated):**
            *   `POST /api/v1/projects` (Creator becomes Owner): Create project & bucket.
            *   `GET /api/v1/projects` (Viewer+): List projects user is member of.
            *   `GET /api/v1/projects/:projectId` (Viewer+): Get project details.
            *   `PATCH /api/v1/projects/:projectId` (Admin+): Update project details.
            *   `DELETE /api/v1/projects/:projectId` (Owner): Delete project & bucket.
            *   `POST /api/v1/projects/:projectId/team` (Admin+): Invite user to team.
            *   `PUT /api/v1/projects/:projectId/team/:memberId` (Admin+): Update member's role (not Owner).
            *   `DELETE /api/v1/projects/:projectId/team/:memberId` (Admin+, or self-remove): Remove member.
        *   **Authorization:** Service layer checks caller's role against required role for the action using `TeamMembers` map.

## Frontend Analysis

### Project Structure (`frontend/src`)

*   **`app/`**: Next.js App Router (Pages, Layouts)
    *   `/`: Landing Page (`page.tsx`)
    *   `/auth/login`, `/auth/signup`: Auth pages
    *   `/about`, `/pricing`, `/socials`, `/tide`: Static/feature pages
    *   Authenticated (`/` prefixed routes):
        *   `/dashboard`
        *   `/projects` (likely list, details)
        *   `/jobs` (likely list, details)
        *   `/analytics`
    *   `layout.tsx`: Root layout
    *   `StoreProvider.tsx`: Global Redux store setup.
*   **`components/`**: Reusable UI (shadcn, magicui, custom `ui`)
*   **`features/`**: Feature-specific components, logic, and potentially API slice injections.
*   **`hooks/`**: Custom React hooks.
*   **`lib/`**: Utilities (`utils.ts` for `cn` function only currently).
*   **`store/`**: State Management (Redux Toolkit)
    *   `index.ts`: Store configuration.
    *   `rootReducer.ts`: Combines reducers.
    *   `hooks.ts`: Typed Redux hooks.
    *   `apiSlice.ts`: Core RTK Query setup.
        *   Uses `fetchBaseQuery`.
        *   Base URL: Configured via `NEXT_PUBLIC_API_BASE_URL` (fallback `http://localhost:8080/v1` - **Note:** Should likely be `http://localhost:8080/api` based on backend `main.go`).
        *   `prepareHeaders`: Currently empty. **Does not attach JWT token.** Assumes backend uses HttpOnly session cookies, OR frontend needs to implement JWT storage/attachment.
        *   `tagTypes`: Defined for caching (`User`, `Project`, `Job`, `TeamMember`).
        *   Endpoints expected to be injected from `features/`.

### Feature Analysis (`frontend/src/features`)

*   **`features/auth/`**
    *   `authSlice.ts`: Standard Redux slice for local auth state (user info, loading status, etc. - assumed).
    *   `authApiSlice.ts`: Injects RTK Query endpoints for authentication into `apiSlice`.
        *   Defines types mirroring backend DTOs (User, RegisterRequest, LoginRequest, LoginResponse - *Note: assumes no token in LoginResponse*).
        *   Endpoints:
            *   `register: mutation (POST /auth/register)`
            *   `login: mutation (POST /auth/login)`
            *   `logout: mutation (POST /auth/logout)`
            *   `getSession: query (GET /auth/session)`
        *   Exports hooks: `useRegisterMutation`, `useLoginMutation`, `useLogoutMutation`, `useGetSessionQuery`.
*   **`features/dashboard/`**: Empty.
*   **`features/projects/`, `features/jobs/`**: (Created) API slices for project/job CRUD and actions defined (`projectApiSlice.ts`, `jobApiSlice.ts`).

## Frontend Component Mapping

*(Mapping based on assumed page structure and required functionality)*

*   **`/auth/login` (Page):**
    *   `useLoginMutation` (`authApiSlice`)
    *   Router for redirect.
*   **`/auth/signup` (Page):**
    *   `useRegisterMutation` (`authApiSlice`)
    *   Router for redirect.
*   **`/(authenticated)/layout.tsx` (Layout - Assumed):**
    *   `useGetSessionQuery` (`authApiSlice`) - For auth check & redirect.
    *   `useLogoutMutation` (`authApiSlice`) - For logout button.
*   **`/dashboard` (Page):**
    *   `useGetSessionQuery` (from layout context)
    *   `useListProjectsQuery` (`projectApiSlice`)
    *   Potentially `useListJobsQuery` (`jobApiSlice`) - *Requires cross-project query handling.*
*   **`/projects` (Page - Project List):**
    *   `useGetSessionQuery` (from layout context)
    *   `useListProjectsQuery` (`projectApiSlice`)
    *   `useCreateProjectMutation` (`projectApiSlice`)
    *   `useDeleteProjectMutation` (`projectApiSlice`)
*   **`/projects/[projectId]` (Page - Project Detail - Assumed):**
    *   `useGetSessionQuery` (from layout context)
    *   `useGetProjectQuery` (`projectApiSlice`)
    *   `useUpdateProjectMutation` (`projectApiSlice`)
    *   `useInviteMemberMutation` (`projectApiSlice`)
    *   `useUpdateMemberRoleMutation` (`projectApiSlice`)
    *   `useRemoveMemberMutation` (`projectApiSlice`)
    *   `useListJobsQuery` (`jobApiSlice` - filtered by projectId)
    *   `useCreateJobMutation` (`jobApiSlice`)
    *   `useGetJobQuery` (`jobApiSlice`)
    *   `useCancelJobMutation` (`jobApiSlice`)
*   **`/jobs` (Page - Global Job List - Assumed):**
    *   `useGetSessionQuery` (from layout context)
    *   `useListJobsQuery` (`jobApiSlice`) - *Requires cross-project query handling.*
    *   `useGetJobQuery` (`jobApiSlice`)
    *   `useCancelJobMutation` (`jobApiSlice`)
*   **`/analytics` (Page):**
    *   `useGetSessionQuery` (from layout context)
    *   Potentially `useListProjectsQuery`, `useListJobsQuery` - *Requires cross-project handling.*
*   **`/` (Landing Page):**
    *   Optionally `useGetSessionQuery` (`authApiSlice`) - To adjust UI.
*   **`/about`, `/pricing`, etc.:**
    *   Likely no API calls needed.

## Integration Tasks

*(Based on analysis and required functionality)*

**Backend:**

*   [x] **API Routes:** Add routes and handlers for Job Submit (`POST /jobs/{jobId}/submit`) and Job Sync Status (`POST /jobs/{jobId}/sync`) in `job/handlers.go` and `cmd/api/main.go`. (Cancel route `DELETE /jobs/{jobId}` also confirmed).
*   [x] **Pipeline:** Implement a non-stub `PipelineClient` in `platform/pipeline/` for production environment. *(Placeholder `datagen_pipeline_client.go` created with TODOs for API calls and auth based on provided spec)*.
*   [x] **Queries:** Refine/add backend endpoints if needed for efficient cross-project job/analytics queries. *(Added `GET /jobs` endpoint to list jobs across accessible projects)*.
*   [x] **Config:** Ensure API base URL consistency (`/api/v1`) between backend setup and frontend configuration/expectations. *(Frontend `apiSlice.ts` updated to correctly construct `/api/v1` URLs)*.

**Frontend:**

*   [x] **Auth:** Implement Login page UI (`/auth/login`) using `useLoginMutation` and handle redirect.
*   [x] **Auth:** Implement Signup page UI (`/auth/signup`) using `useRegisterMutation` and handle redirect.
*   [x] **Auth:** Implement authenticated layout (`/(authenticated)/layout.tsx`) using `useGetSessionQuery` (auth check/redirect) and `useLogoutMutation` (logout button).
*   [x] **Projects:** Implement Projects list page UI (`/projects`) using `useListProjectsQuery`, `useCreateProjectMutation` (modal?), `useDeleteProjectMutation`. Handle pagination, roles, loading/error states.
*   [x] **Projects:** Implement Project detail page UI (`/projects/[projectId]`) using `useGetProjectQuery`.
*   [x] **Projects:** Implement Project update form/modal using `useUpdateProjectMutation`.
*   [x] **Projects:** Implement Team management UI within project detail page using invite/update/remove member mutations. Include role checks in UI.
*   [x] **Jobs:** Implement Jobs list UI within project detail page using `useListJobsQuery` (filtered). Handle pagination, loading/error states.
*   [x] **Jobs:** Implement Create Job form/modal within project detail page using `useCreateJobMutation`.
*   [x] **Jobs:** Implement Job cancel functionality using `useCancelJobMutation`.
*   [x] **Jobs:** Implement Job detail view (if needed) using `useGetJobQuery`.
*   [x] **Jobs:** Add `submitJob` and `syncJobStatus` mutations to `jobApiSlice.ts` and integrate into UI (requires backend endpoints).
*   [x] **Dashboard:** Implement Dashboard UI using relevant project/job list queries.
*   [ ] **Analytics:** Implement Analytics page UI using necessary data queries (may require backend changes). TASK DEFFERED
*   [x] **Core:** Refactor shared Typescript types (User, Project, Job, Role etc.) into a central `types/` directory.
*   [x] Implement Backend Task 4 (Base URL Config)
*   [x] Implement Frontend Task 1 (Login Page)
*   [x] Implement Frontend Task 2 (Signup Page)
*   [x] Implement Frontend Task 3 (Authenticated Layout)
*   [x] Implement Frontend Task 4 (Projects List Page)
*   [x] Implement Frontend Task 5 (Project Detail Page)
*   [x] Implement Frontend Task 6 (Project Update Form)
*   [x] Implement Frontend Task 7 (Team Management UI)
*   [x] Implement Frontend Task 8 (Jobs List UI - Fetch & Paginate)
*   [x] Implement Frontend Task 9 (Create Job Modal)
*   [x] Implement Frontend Task 10 (Job Cancel Action)
*   [x] Implement Frontend Task 11 (Job Detail View)
*   [x] Implement Frontend Task 12 (Job Submit/Sync Actions)
*   [x] Implement Frontend Task 13 (Dashboard Integration)
*   [x] Implement Remaining Frontend Tasks (Refactor Types)
*   [ ] Test Integrations

## Progress Tracking

*   [x] Analyze `backend/internal/auth/`
*   [x] Analyze `backend/internal/core/`
*   [x] Analyze `backend/internal/job/`
*   [x] Analyze `backend/internal/platform/`
*   [x] Analyze `backend/internal/project/`
*   [x] Analyze `backend/cmd/api/` (Endpoints definition)
*   [x] Analyze `openapi.yaml`
*   [x] Analyze Frontend Structure (`app`, `lib`, `store`, `features`)
*   [x] Resolve Auth Discrepancy (Backend uses HttpOnly Cookies)
*   [x] Define Frontend API Slices (`auth`, `project`, `job`)
*   [x] Map Frontend Components to API Endpoints
*   [x] Define Integration Tasks (*Marked complete*)
*   [x] Implement Backend Task 1 (Job Submit/Sync Routes)
*   [x] Implement Backend Task 2 (Pipeline Client Placeholder)
*   [x] Implement Backend Task 3 (Cross-Project Job Query Endpoint)
*   [x] Implement Backend Task 4 (Base URL Config)
*   [x] Implement Frontend Task 1 (Login Page)
*   [x] Implement Frontend Task 2 (Signup Page)
*   [x] Implement Frontend Task 3 (Authenticated Layout)
*   [x] Implement Frontend Task 4 (Projects List Page)
*   [x] Implement Frontend Task 5 (Project Detail Page)
*   [x] Implement Frontend Task 6 (Project Update Form)
*   [x] Implement Frontend Task 7 (Team Management UI)
*   [x] Implement Frontend Task 8 (Jobs List UI - Fetch & Paginate)
*   [x] Implement Frontend Task 9 (Create Job Modal)
*   [x] Implement Frontend Task 10 (Job Cancel Action)
*   [x] Implement Frontend Task 11 (Job Detail View)
*   [x] Implement Frontend Task 12 (Job Submit/Sync Actions)
*   [x] Implement Frontend Task 13 (Dashboard Integration)
*   [x] Implement Remaining Frontend Tasks (Refactor Types)
*   [ ] Test Integrations

---