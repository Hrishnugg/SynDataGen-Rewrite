# Synoptic Project Rewrite Plan

This document outlines the plan for rewriting the Synoptic application, splitting the frontend and backend, migrating the backend to Golang, and overhauling the frontend UI/UX.

## Goals

*   Separate Frontend (React/Next.js) and Backend (Golang) into distinct deployment units.
*   Rewrite the backend entirely in Golang for potential performance and maintainability improvements.
*   Completely overhaul and redesign the frontend for better UI/UX and cleaner architecture.
*   Achieve a cleaner, more maintainable, and potentially smaller overall codebase.
*   Establish clear API contracts between frontend and backend.
*   Improve testing practices (TDD focus).

## Proposed Phases

### Phase 1: Requirement Clarification & Analysis (Understand the Current State)

*   **Goal**: Deeply understand the existing application's functionality, data flow, and specific logic.
*   **Actions**:
    *   **Full Feature Audit**: Document *all* existing features (esp. code generation/analysis). Detail inputs, outputs, and steps.
    *   **Backend Logic Identification**:
        *   Map current Next.js API routes (`src/pages/api/`).
        *   Identify server-side logic (`getServerSideProps`, `getStaticProps`).
        *   Analyze `src/scripts` for backend tasks.
        *   Examine `src/lib` and `src/features` for backend logic/data handling.
        *   Understand `dataconnect-generated` usage.
    *   **Frontend Logic Identification**:
        *   Catalog React components (`src/components`, `src/features`), pages (`src/pages`), context (`src/context`).
        *   Document component responsibilities and interactions.
        *   Analyze `ParticleWaves`/Three.js usage.
    *   **Data Flow Mapping**: Diagram data flow (FE <-> BE <-> Firestore). Define current data structures.
    *   **Dependency Analysis**: List external dependencies; plan for replacements/equivalents (Firebase Admin Go SDK, etc.).
*   **Validation**: Ensure a complete understanding of *what* the system does.

### Phase 2: Core Solution Design (Define the New Architecture)

*   **Goal**: Design the high-level structure and interaction patterns for the new system.
*   **Actions**:
    *   **Repository Structure**: Define layout for the *new* repo:
        ```
        /new-synoptic-project
          /backend       # Golang backend
          /frontend      # React/Next.js frontend
          /docs          # Documentation
          /scripts       # Shared utility scripts (optional)
          README.md
        ```
    *   **Backend (Golang)**:
        *   **Framework Selection**: Choose Go web framework (e.g., Gin, Echo, Chi, `net/http`).
        *   **API Design**: Define API contract (REST/GraphQL/gRPC?). Specify endpoints, formats (OpenAPI?).
        *   **Project Structure (Go)**: Plan Go module organization (e.g., `/cmd`, `/internal`, layered architecture).
        *   **Data Modeling & Persistence**: Design Go structs. Plan Firestore interaction (Go SDK). Replace `dataconnect`.
        *   **Core Logic Migration Plan**: Outline Go implementation for core features. Identify libraries.
        *   **Authentication/Authorization**: Design API security model.
    *   **Frontend (React/Next.js Overhaul)**:
        *   **Framework Confirmation**: Re-evaluate Next.js vs. SPA (Vite + React?).
        *   **UI/UX Redesign**: Plan the new user interface and experience.
        *   **Component Architecture**: Design clean, reusable component library (`/frontend/src/components`).
        *   **State Management**: Choose solution (Zustand, Jotai, Redux Toolkit, Context API?).
        *   **API Interaction**: Select data fetching library (`react-query`, `swr`, `axios`, `fetch`).
        *   **Project Structure (React)**: Define structure (`/components`, `/pages`, `/hooks`, `/lib`, `/services`, `/state`, `/styles`).
        *   **Three.js Integration**: Plan `ParticleWaves` integration.
*   **Validation**: Does the architecture separate concerns? Is the API contract clear? Does it align with goals?

### Phase 3: Implementation Strategy (Build Incrementally)

*   **Goal**: Execute the build process methodically, focusing on core functionality and testing.
*   **Actions**:
    *   **Prioritization**: Identify MVP features. Start there.
    *   **Backend First**: Build and test core Go backend API endpoints first (TDD).
        *   Set up Go project, dependencies (Firestore SDK).
        *   Implement core API endpoints (auth, core models).
        *   Write unit and integration tests.
    *   **Frontend Second**: Build new frontend against the *working* Go API.
        *   Set up frontend project structure.
        *   Implement MVP UI components and pages.
        *   Integrate API communication.
        *   Implement frontend testing (RTL, Cypress/Playwright?).
    *   **Iterative Feature Migration**: Migrate features one by one, implementing BE Go logic and FE UI/interactions, guided by tests.
    *   **Tooling Setup**: Configure build tools, linters, formatters, CI/CD early for both `/backend` and `/frontend`.
    *   **Data Migration (If Needed)**: Plan and script Firestore data transformation if needed.
*   **Validation**: Are we building priority features? Are tests guiding implementation? Is the API contract followed?

### Phase 4: Refinement & Deployment (Polish and Launch)

*   **Goal**: Ensure the new system is robust, performant, and ready for deployment.
*   **Actions**:
    *   **Code Reviews**: Conduct thorough reviews (clarity, SOLID, DRY, KISS, YAGNI).
    *   **Refactoring**: Continuously refactor based on feedback and understanding.
    *   **Performance Testing**: Profile and optimize Go backend and React frontend.
    *   **Security Audit**: Review auth, input validation, vulnerabilities.
    *   **Documentation**: Finalize setup, development, API, deployment docs.
    *   **Deployment Strategy**: Plan Go backend deployment (Cloud Run, GKE?) and React frontend deployment (Vercel, Netlify?).
*   **Validation**: Does the final code meet goals? Is it tested and documented?

## Key Design Decisions (Finalized)

1.  **Go Backend Framework**: Gin
2.  **API Style**: REST (Contract defined via OpenAPI/Swagger v3.1)
3.  **Frontend Framework**: Next.js (App Router) (Plan upgrade to React 19 & Tailwind v4)
4.  **Frontend State Management**: Redux Toolkit
5.  **Frontend Data Fetching**: RTK Query (integrates with Redux Toolkit)
6.  **Authentication/Authorization**: Backend-Managed (Go handles login/register/session logic via secure cookies; RBAC implemented).
7.  **Testing Strategy**:
    *   Go: Standard `testing`, `testify`, `net/http/httptest`.
    *   React: Jest, React Testing Library (RTL), Cypress/Playwright.
8.  **Deployment Architecture**: Go Backend on GKE (Docker); Next.js Frontend on Vercel; Database on Firestore.

## Progress Summary (as of [Current Date/Time])

*   **Phase 1 (Analysis)**: Completed.
*   **Phase 2 (Core Design)**: Completed.
*   **Phase 3 (Implementation - Backend First)**: In Progress.
    *   Set up initial Go backend project structure (`/backend`) with `go.mod`.
    *   Implemented core **Authentication** components (models, interfaces, service, repository, middleware, handlers, routes) using session cookies.
    *   Implemented core **Project** components (models, interfaces, service, repository, handlers, routes).
    *   Implemented concrete **GCP Storage Service** (`storage.gcpStorageService`) including bucket creation/deletion and added `BucketURI` to `core.ProjectStorage`.
    *   Implemented core **Job Management** scaffolding:
        *   Models: `core.Job`, `core.JobStatus`.
        *   Interfaces: `core.JobRepository`, `job.PipelineClient`, `job.JobService`.
        *   Implementations: `job.jobService`, `firestore.jobRepository`.
        *   Infrastructure: `pipeline.stubPipelineClient` (simulates external pipeline), `job.JobHandler` (Create, Get, List), `job.CreateJobRequest` DTO.
        *   Job routes registered and protected in `cmd/api/main.go`.
    *   Implemented **RBAC (Role-Based Access Control)**:
        *   Defined Roles (`owner`, `admin`, `member`, `viewer`) in `core`.
        *   Updated `core.Project` to use `TeamMembers map[string]core.Role`.
        *   Updated `firestore.projectRepository` query logic for team membership.
        *   Implemented authorization checks (`checkProjectAccess`, `authorizeJobAction`) in `project.service` and `job.service`.
        *   Integrated checks into Project and Job service methods.
    *   Implemented **Team Management Backend**:
        *   Added `InviteMember`, `UpdateMemberRole`, `RemoveMember` methods to `project.ProjectService`.
        *   Injected `core.UserRepository` dependency into `project.ProjectService`.
        *   Implemented service logic for team management, including validation (user exists, cannot remove last owner, etc.).
        *   Added corresponding handlers (`InviteMember`, `UpdateTeamMemberRole`, `RemoveTeamMember`) in `project.handlers`.
        *   Registered API routes (`POST /team`, `PUT /team/:memberId`, `DELETE /team/:memberId`) under `/projects/:projectId`.
    *   Implemented **Backend Testing** (Unit/Integration):
        *   Unit tests for `storage.gcpStorageService` (using mocks).
        *   Integration tests for `firestore.jobRepository` (using Firestore emulator).
        *   Unit tests for `job.jobService` (using mocks).
        *   Unit tests for `job.JobHandler` (Create, Get, List) (using `net/http/httptest`).
        *   Unit tests for RBAC helper functions (`checkProjectAccess`, `authorizeJobAction`).
        *   Unit tests for Team Management service methods (`InviteMember`, `UpdateMemberRole`, `RemoveMember`).
        *   Handler tests for Team Management endpoints.
    *   Updated **OpenAPI Specification** (`openapi.yaml`) to v3.1, reflecting RBAC changes (TeamMembers map) and adding Team Management endpoints and schemas.
    *   **Not Started / Pending**: Full Job logic implementation (Submit/Cancel handlers, real pipeline client integration), Frontend implementation.

## Proposed Architecture Details

### Backend (Go) Structure
```
/backend
  /cmd
    /api          # Main API server entry point (main.go)
  /internal
    /auth         # Auth domain (user model, repo, service, handlers, middleware)
    /project      # Project domain (project model, repo, service, handlers - incl. team mgmt)
    /job          # Job domain (job model, repo, service, handlers, pipeline client interface)
    /core         # Core interfaces (Repositories), domain models (User, Project, Job, Role etc.)
    /platform     # Infrastructure implementations
      /firestore  # Firestore repository implementations (User, Project, Job)
      /storage    # GCP Storage service implementation
      /logger     # Logger setup
      /pipeline   # Pipeline client implementations (stub, real)
      # /cache    # Cache implementation (if needed)
  go.mod
  go.sum
  openapi.yaml  # API Specification
  # Dockerfile, configs, etc.
```

### Frontend (React/Next.js) Structure
```
/frontend
  /app            # Next.js App Router (routes, layouts, pages)
    /dashboard
    /auth
    /project/[projectId]
      /settings/team # Example route for team management UI
      page.tsx       # Project overview page
    layout.tsx
    page.tsx         # Root page (e.g., redirect to auth or dashboard)
  /components     # Shared, reusable UI components (e.g., Button, Card, Table)
    /ui           # Shadcn/ui components
  /features
    /auth         # Auth components, RTK Query endpoints, Redux slice
    /projects     # Project components (list, create, details), RTK Query, Redux slice
    /jobs         # Job components (list, create, details), RTK Query, Redux slice
    /team         # Team management specific components (invite form, member list)
    /dashboard    # Components specific to the main dashboard layout/view
  /lib            # Shared utilities, hooks, API client setup
  /store          # Redux Toolkit setup
    index.ts      # Store configuration
    rootReducer.ts # Combine feature slices
    hooks.ts      # Typed useSelector/useDispatch hooks
    apiSlice.ts   # RTK Query base API slice (configured for Go backend)
  /styles         # Global styles
    globals.css
  tailwind.config.js
  postcss.config.js
  next.config.mjs
  tsconfig.json
  package.json
  README.md
```

## Next Steps

1.  **Start Frontend Implementation (Phase 3)**:
    *   Set up the `/frontend` directory structure as defined above.
    *   Configure base Next.js setup, Tailwind CSS, Redux Toolkit store, and RTK Query (pointing to the Go backend API base URL).
    *   Implement core layouts (e.g., dashboard sidebar, main content area).
    *   Implement frontend Authentication flow (Login, Register pages) interacting with the Go backend Auth endpoints via RTK Query mutations.
    *   Build UI for core Project features (List, Create, View) using RTK Query hooks to fetch/mutate data.
    *   Build UI for core Team Management features (Invite Member form, Member List with Role Update/Remove options) within the Project view, using RTK Query.
    *   Implement initial frontend tests (RTL for components, potentially Cypress/Playwright for E2E flows like login).*
2.  **Implement Remaining Job Logic (Backend - Phase 3 Continuation)**:
    *   Implement `SubmitJob` handler and service logic (calling `pipeline.Submit`).
    *   Implement `CancelJob` handler and service logic (calling `pipeline.Cancel`).
    *   Implement `SyncJobStatus` logic fully if needed beyond basic structure.
    *   Implement the *real* `pipeline.RESTPipelineClient` once the external pipeline API details are available/defined.
    *   Add unit/integration tests for the new Job logic.
    *   Update `openapi.yaml` with finalized Job action endpoints (Submit, Cancel).
3.  **Refine Backend (Phase 3 Continuation)**:
    *   Address any outstanding TODO comments in the backend code.
    *   Review and refine error handling and logging across all modules.
    *   Consider adding more robust integration tests covering cross-service interactions (e.g., creating a project and then a job within it).
4.  **Future Considerations (Post MVP / Phase 4)**:
    *   Refine Auth (JWT refresh tokens?, move secret to KMS/Secret Manager?).
    *   Implement advanced Team features (pending invites, notifications).
    *   Implement Data Viewer / Data Chat features.
    *   Performance testing, security audits, final documentation.
    *   Deployment to GKE/Vercel.

*   **Iterate**: Continuously update this plan document as needed. 