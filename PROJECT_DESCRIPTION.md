# Project Description: Synoptic Data Generation Platform Rewrite

**Date:** [Current Date]

## 1. Project Overview

Synoptic is a cloud-based platform designed to empower data scientists, ML engineers, and developers by enabling the creation of high-quality synthetic data. This project entails a complete technical rewrite and architectural overhaul of the existing Synoptic application **to serve as a user-friendly control plane for an existing, external data generation pipeline.**

The primary drivers for this rewrite are to improve maintainability, enhance scalability, modernize the technology stack, decouple the frontend and backend components, and deliver a superior user experience **for managing the data generation lifecycle.**

## 2. Problem Statement

The original Synoptic codebase, while functional, faces challenges related to:

*   **Technical Debt:** Accumulation of quick fixes or suboptimal design choices hinders development speed and increases the risk of bugs.
*   **Scalability Limitations:** The existing architecture may not scale efficiently to meet growing user demand or more complex data generation tasks.
*   **Maintainability:** A tightly coupled frontend and backend make independent updates and bug fixes difficult and time-consuming.
*   **Technology Stack:** The existing stack (Next.js monolith) may not be the optimal choice for long-term goals, particularly for backend processing and API development.
*   **User Experience:** The current UI/UX, while functional, requires a significant overhaul to meet modern standards of usability and aesthetics.

## 3. Proposed Solution

We will rewrite the application from the ground up, adopting a modern, decoupled architecture:

*   **Backend:** A new backend API will be developed using **Go** and the **Gin** web framework. It will handle all business logic, data persistence (via **Firestore**), user authentication, project management, and **serve as the intermediary communicating job requests and status updates with the external data generation pipeline API**. It will expose a **REST API** defined by an **OpenAPI (Swagger)** specification.
*   **Frontend:** A new frontend web application will be developed using **React** and the **Next.js (App Router)** framework (planning upgrades to React 19 & Tailwind CSS v4). It will be responsible for the user interface, user interaction, and communication with the Go backend API. State management will use **Redux Toolkit** with **RTK Query** for data fetching.
*   **Infrastructure:** The Go backend will be containerized (Docker) and deployed to **Google Kubernetes Engine (GKE)**. The Next.js frontend will be deployed to **Vercel**. **Firestore** will remain the primary database for application metadata (users, projects, job state). **Google Cloud Storage (GCS)** will be used for storing generated data in project-specific buckets (likely managed/written to by the external pipeline).

## 4. Key Features (Post-Rewrite)

The rewritten platform will retain and improve upon the core features:

*   **User Authentication:** Secure registration and login.
*   **Project Management:** Creation, listing, viewing, updating, and deleting/archiving of data generation projects.
*   **Job Management:** Configuration, submission, status tracking, cancellation, and results access for synthetic data generation jobs.
*   **Data Storage:** Secure, isolated storage for project data in GCS.
*   **Data Viewing:** In-app tool for viewing generated datasets.
*   **Data Chat:** Interactive chat interface for querying viewed datasets.
*   **(Future) Team Collaboration:** Invite users, manage roles within projects.

## 5. Technical Goals & Choices

*   **Language Choice (Go):** Leverage Go's performance, concurrency features, and suitability for building robust backend APIs.
*   **Decoupled Architecture:** Enforce strict separation between frontend and backend via the REST API, enabling independent scaling and development.
*   **Clean Code & Testing:** Adhere to SOLID principles, maintain high test coverage (unit, integration, E2E) using standard Go and React testing stacks.
*   **Scalable Deployment:** Utilize GKE and Vercel for scalable and manageable deployments.
*   **Modern Frontend:** Employ Next.js App Router, React 19, Tailwind v4, Redux Toolkit, and RTK Query for a performant and maintainable frontend.

## 6. Scope (Initial Rewrite - MVP)

The initial focus is on rebuilding the core functionality to achieve parity with the essential workflow:

1.  User registration and login.
2.  Project CRUD operations.
3.  Basic data generation job submission and status viewing.
4.  Access to generated job output.

Advanced features like detailed team collaboration, sophisticated data viewer interactions (chat), and admin functionalities will be addressed in subsequent phases.

## 7. Project Plan

A detailed, phased plan is documented in `REWRITE_PLAN.md`, covering analysis, design, implementation, and deployment. 