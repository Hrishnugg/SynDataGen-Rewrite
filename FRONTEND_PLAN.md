# Frontend Development Plan: Synoptic Rewrite

This document outlines the technical decisions, architecture, and implementation strategy for the frontend of the rewritten Synoptic application.

## 1. Goals

*   Build a modern, responsive, and user-friendly interface for the Synoptic platform.
*   Ensure maintainability, testability, and scalability of the frontend codebase.
*   Integrate seamlessly with the Go backend API via a defined REST contract.
*   Provide a clear control plane for managing synthetic data generation projects and jobs.

## 2. Core Technology Stack

*   **Framework:** Next.js 15 (latest, App Router)
*   **Language:** TypeScript
*   **UI Library:** Aceternity UI (Licensed and approved for use)
*   **Styling:** Tailwind CSS v4 (Stable)
*   **State Management:** Redux Toolkit
*   **API Interaction / Data Fetching:** RTK Query (integrated with Redux Toolkit)
*   **Target React Version:** React 19

## 3. UI Component Strategy

*   **Primary Library:** Aceternity UI will be the foundation for UI components.
*   **Source Code Integration:** Utilize the provided source code for Aceternity UI components directly. Modifications should only be made when absolutely necessary and clearly documented.
*   **Configuration:** Diligently manage dependencies and CSS configurations required by each Aceternity UI component, regularly consulting their documentation.
*   **Custom Components:** Avoid creating components from scratch. Only develop custom components if Aceternity UI does not offer a suitable primitive or pattern, or if significant, unavoidable modifications to existing Aceternity components are required. Organize these minimally required custom components logically (e.g., `/components/shared`, `/features/**/components`).
*   **Composition:** Favor composition of Aceternity UI components (using their provided source) and minimal custom components to build complex UI elements.

## 4. State Management (Redux Toolkit + RTK Query)

*   **Structure:** Organize Redux state by feature slices (e.g., `features/auth/authSlice.ts`, `features/projects/projectsSlice.ts`).
*   **RTK Query:** Define API interactions within feature-specific API slices that inject endpoints into the main `apiSlice.ts`.
*   **Global State:** Use dedicated slices for genuinely global state (e.g., UI notifications, potentially user profile if not derived solely from RTK Query).
*   **Selectors:** Utilize `createSelector` for memoized state derivation where needed.

## 5. Styling (Tailwind CSS v4)

*   **Configuration:** Define the application's theme (colors, fonts, spacing) in `tailwind.config.js`. Utilize v4 features as appropriate.
*   **Utility Classes:** Primarily use Tailwind utility classes directly in components.
*   **Global Styles:** Use `globals.css` for base styles, resets, font imports, and necessary Aceternity UI global CSS.
*   **Conventions:** Establish conventions for class ordering and application (e.g., using Prettier plugin for Tailwind).

## 6. Directory Structure (Proposed)

```
/frontend
  /app            # Next.js App Router (routes, layouts, pages)
    /auth         # Login, Register routes
    /dashboard    # Main authenticated layout and potentially overview page
    /project/[projectId] # Project-specific routes
      /settings   # Project settings sub-routes (e.g., team)
      page.tsx    # Project overview/details page
    layout.tsx    # Root layout
    (loading.tsx, error.tsx etc. as needed)
  /components     # Shared, reusable UI components (non-feature specific)
    /shared       # Custom shared components (e.g., PageHeader, DataTableWrapper)
    # Potentially wrappers or adapters for Aceternity UI if needed
  /features       # Feature-specific modules
    /auth         # Auth components (LoginForm), RTK Query endpoints, Redux slice
    /projects     # Project components (ProjectList, CreateProjectForm), RTK Query, Redux slice
    /jobs         # Job components (JobList, JobDetails), RTK Query, Redux slice
    /team         # Team management components (InviteForm, MemberList)
    /dashboard    # Components specific to the main dashboard layout/view
  /lib            # Shared utilities, hooks, constants, type definitions
  /store          # Redux Toolkit setup
    index.ts      # Store configuration
    rootReducer.ts # Combine feature slices
    hooks.ts      # Typed useSelector/useDispatch hooks
    apiSlice.ts   # RTK Query base API slice
  /styles         # Global styles, fonts
    globals.css
  tailwind.config.js
  postcss.config.js
  next.config.mjs
  tsconfig.json
  package.json
  README.md       # Frontend-specific README
  /docs           # Frontend documentation (like this plan)
    FRONTEND_PLAN.md
```

## 7. API Interaction (RTK Query)

*   **Base Slice:** Configure `apiSlice.ts` with the base URL of the Go backend API.
*   **Endpoint Injection:** Define specific endpoints (queries, mutations) in feature slices (`features/auth/authApiSlice.ts`).
*   **Authentication:** Configure RTK Query middleware to handle attaching credentials (likely leveraging the backend's secure HttpOnly cookie mechanism automatically, but verify). Explicitly manage auth state in Redux based on API responses (login success/failure, user data fetch).
*   **State Handling:** Utilize RTK Query's built-in state (isLoading, isFetching, isSuccess, isError, data) for driving UI feedback.
*   **Caching:** Leverage RTK Query's caching mechanisms; define appropriate tags for cache invalidation (e.g., invalidate 'Projects' list after a successful creation mutation).

## 8. Authentication Flow (Client-Side)

*   **Login/Register:** Forms dispatch RTK Query mutations. On success, update Redux auth state (e.g., `isAuthenticated = true`, store user info) and redirect to the dashboard. On failure, display error messages.
*   **Session Management:** Rely primarily on backend session cookies. Frontend might store minimal auth state (e.g., `isAuthenticated` flag) in Redux, potentially persisted to local storage for immediate UI feedback on reload before hydration/revalidation.
*   **Protected Routes:** Implement client-side checks (e.g., in root layout or specific route layouts) based on Redux auth state to redirect unauthenticated users to the login page. Leverage Next.js middleware for server-side protection if needed/desired.

## 9. Testing Strategy

*   **Unit/Integration:** Jest + React Testing Library (RTL) for testing individual components, hooks, and Redux logic/selectors. Mock API responses using tools like MSW (Mock Service Worker) or Jest mocks.
*   **End-to-End (E2E):** Playwright. Define core user flow tests (Login, Create Project, Submit Job).
*   **Initial Scope (MVP):**
    *   RTL tests for Login/Register forms, core layout components, ProjectList/CreateProjectForm.
    *   Playwright E2E tests for the authentication flow (login/logout) and creating a new project.

## 10. Linting & Formatting

*   **Tools:** ESLint + Prettier.
*   **Configuration:** Use standard recommended configs (e.g., `eslint-config-next`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, TypeScript ESLint) plus Tailwind Prettier plugin. Enforce rules via CI.

## 11. Build & Deployment

*   **Target:** Vercel.
*   **Environment Variables:** Manage API base URLs and other environment-specific configurations via Vercel environment variables (`NEXT_PUBLIC_` prefix for client-side access).
*   **CI/CD:** Set up GitHub Actions (or similar) for running tests, linting, checks, and triggering Vercel deployments on merge to main/production branch.

## 12. Core UI/UX Patterns (To Be Defined)

*   **Layout:** Sidebar navigation, main content area, header (user menu, notifications?).
*   **Forms:** Consistent styling, validation feedback (client-side + server-side errors).
*   **Data Display:** Standard patterns for tables (pagination, sorting?), lists, cards.
*   **Modals:** Usage for confirmation dialogs, forms (e.g., Create Project?).
*   **Feedback:** Loading indicators (global, per-component), toast notifications for success/error messages.

## 13. Open Questions / Decisions Needed

*   Specific Aceternity UI components to leverage for core patterns (Tables, Modals, Forms, etc.) - *Requires review of Aceternity docs against UI/UX needs.*
*   Detailed approach for client-side session state persistence (if any beyond Redux in-memory) - *Likely rely on backend cookies primarily, Redux for loading/UI state.*
*   Exact structure for shared utility types/functions within `/lib`.
*   Refine the core UI/UX patterns section with specific examples/component choices based on Aceternity UI.

---

*This plan is a living document and will be updated as decisions are made and the project progresses.* 