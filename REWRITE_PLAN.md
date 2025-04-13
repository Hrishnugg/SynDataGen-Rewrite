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
2.  **API Style**: REST (Contract defined via OpenAPI/Swagger)
3.  **Frontend Framework**: Next.js (App Router) (Plan upgrade to React 19 & Tailwind v4)
4.  **Frontend State Management**: Redux Toolkit
5.  **Frontend Data Fetching**: RTK Query (integrates with Redux Toolkit)
6.  **Authentication/Authorization**: Backend-Managed (Go handles login/register/session logic; NextAuth.js likely removed/minimized on FE)
7.  **Testing Strategy**: 
    *   Go: Standard `testing`, `testify`, `net/http/httptest`.
    *   React: Jest, React Testing Library (RTL), Cypress/Playwright.
8.  **Deployment Architecture**: Go Backend on GKE (Docker); Next.js Frontend on Vercel; Database on Firestore.

## Progress Summary (as of [Current Date/Time])

*   **Phase 1 (Analysis)**: Completed. Analyzed existing codebase structure, features, dependencies, and identified areas for improvement.
*   **Phase 2 (Core Design)**: Completed. Finalized key design decisions for frameworks, API style, state management, data fetching, auth strategy, testing, and deployment.
*   **Phase 3 (Implementation - Backend First)**: In Progress.
    *   Defined initial OpenAPI v3.1 specification (`openapi.yaml`) covering Auth and Project resources.
    *   Set up initial Go backend project structure (`/backend`) with `go.mod`.
    *   Implemented core **Authentication** components:
        *   Models: `core.User`
        *   Interfaces: `core.UserRepository`, `auth.AuthService`
        *   Implementations: `auth.authService`, `firestore.userRepository`
        *   Infrastructure: `auth.AuthMiddleware`, `auth.AuthHandlers`, Logger, Config via Env
    *   Implemented core **Project** components:
        *   Models: `core.Project`, `core.ProjectSettings`, `core.ProjectStorage`, `core.TeamMember`
        *   Interfaces: `core.ProjectRepository`, `core.StorageService`, `project.ProjectService`
        *   Implementations: `project.projectService`, `firestore.projectRepository`
        *   Infrastructure: Placeholder `storage.gcpStorageService`, **`project.ProjectHandlers`**
    *   **Missing for Projects**: Registration of project routes and auth middleware application in `cmd/api/main.go`.
    *   **Not Started**: Data Generation Jobs (OpenAPI, models, interfaces, services, handlers, routes).

## Proposed Architecture Details

### Backend (Go) Structure
```
/backend
  /cmd
    /api          # Main API server entry point (main.go)
  /internal
    /auth         # Auth domain, services, handlers, middleware
    /project      # Project domain, services, handlers
    /job          # Job domain, services, handlers
    /core         # Core interfaces (Repositories), domain models (User, Project)
    /platform     # Infrastructure implementations
      /firestore  # Firestore repository implementations
      /storage    # GCP Storage service implementation
      /logger     # Logger setup
      # /cache    # Cache implementation (if needed)
      # /jwt      # JWT handling utilities (if separated)
  go.mod
  go.sum
  # Dockerfile, configs, etc.
```

### Frontend (React/Next.js) Structure
```
/frontend
  /app            # Next.js App Router (routes, layouts, pages)
    /dashboard
    /auth
    layout.tsx
    page.tsx
  /components     # Shared, reusable UI components (e.g., Button, Card)
    /ui           # Shadcn/ui components
  /features
    /auth         # Auth specific components, RTK Query endpoints?, Redux slice?
    /projects     # Project specific components, RTK Query endpoints, Redux slice?
    /jobs         # Job specific components, RTK Query endpoints, Redux slice?
    /dashboard    # Components specific to the main dashboard layout/view
  /lib            # Shared utilities, hooks
  /store          # Redux Toolkit setup
    index.ts      # Store configuration
    rootReducer.ts # Combine feature slices
    hooks.ts      # Typed useSelector/useDispatch hooks
    apiSlice.ts   # RTK Query base API slice
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

*   **Implement Backend (Phase 3 Continuation)**:
    *   Register Project routes and apply auth middleware in `backend/cmd/api/main.go`.
    *   Define OpenAPI spec, models, interfaces, services, repositories, and handlers for **Data Generation Jobs**.
    *   Implement the placeholder `gcpStorageService` with actual GCP calls.
    *   Refine error handling and logging throughout the backend.
    *   Implement authorization logic within services (checking user roles/permissions).
    *   Write unit and integration tests for backend components.
*   **Start Frontend (Phase 3)**:
    *   Set up `/frontend` directory structure.
    *   Configure Redux Toolkit store and RTK Query.
    *   Implement core layouts and UI components (using Shadcn/ui initially, plan for Aceternity UI later).
    *   Implement frontend auth flow connecting to the Go backend API.
    *   Build UI for MVP features (Project list/details, Job list/details, Create Job form) connecting to the Go API via RTK Query.
    *   Implement frontend tests.
*   **Refinement & Deployment (Phase 4)**: Address code reviews, performance testing, security audits, documentation, and final deployment to GKE/Vercel.
*   **Iterate**: Continuously update this plan document as needed. 