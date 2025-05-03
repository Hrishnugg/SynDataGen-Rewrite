# Deployment Plan: Frontend (Vercel) & Backend (Kubernetes)

This document outlines the steps required to configure the frontend and backend for independent deployment on Vercel and Kubernetes, respectively, ensuring proper communication between them.

## I. Frontend Preparation (Vercel)

1.  **Environment Variable for API URL:**
    *   Identify all places in the frontend codebase where the backend API is called.
    *   If not already centralized, create an API client utility (e.g., `src/lib/api.ts` or similar) to handle requests.
    *   Configure the API client to use `process.env.NEXT_PUBLIC_API_URL` as the base URL for all requests.
    *   **Action:** Update frontend code to use `process.env.NEXT_PUBLIC_API_URL`.
    *   **Action:** Configure `NEXT_PUBLIC_API_URL` in Vercel project settings for Production, Preview, and Development environments, pointing to the respective backend URLs (e.g., `https://api.yourdomain.com`, `https://preview-api.yourdomain.com`, `http://localhost:8080` for local).

2.  **Vercel Deployment Settings:**
    *   Ensure build commands (`npm run build`) and framework presets in Vercel are correctly configured for Next.js.
    *   Verify necessary environment variables (including `NEXT_PUBLIC_API_URL`) are set in Vercel.

## II. Backend Preparation (Kubernetes)

1.  **CORS Configuration:**
    *   Modify `backend/cmd/api/main.go` to read allowed CORS origins from an environment variable (e.g., `CORS_ALLOWED_ORIGINS`).
    *   The value should be a comma-separated string of allowed origins (e.g., Vercel production domain, preview domains, localhost for development).
    *   **Action:** Update CORS middleware in `main.go` to use `os.Getenv("CORS_ALLOWED_ORIGINS")`.

2.  **GCP Authentication (Service Account):**
    *   **Action:** Create a Google Cloud Service Account (e.g., `syndatagen-backend-sa`) in your GCP project.
    *   **Action:** Grant the Service Account necessary IAM roles for Firestore and GCS access (follow least privilege).
    *   **Action:** Create a JSON key for the Service Account and download it securely. **Do not commit this key to Git.**
    *   **Action:** Create a Kubernetes Secret to store the key file: `kubectl create secret generic gcp-sa-key --from-file=key.json=/path/to/downloaded-key.json`.
    *   **Note:** The backend Go code (using `firestore.NewClient` and `storage.NewClient`) will automatically use the key if the `GOOGLE_APPLICATION_CREDENTIALS` environment variable points to its mounted path in the container. No code changes are required for this.

3.  **Health Check Endpoints:**
    *   Add two simple HTTP endpoints in `main.go`:
        *   `/healthz`: Returns `200 OK` to indicate the server process is running (liveness probe).
        *   `/readyz`: Returns `200 OK` when the application is ready to serve traffic (readiness probe - might include checks like database connectivity if applicable).
    *   **Action:** Implement `/healthz` and `/readyz` endpoints in `main.go`.

4.  **Dockerfile:**
    *   Create a `Dockerfile` in the `backend/` directory.
    *   Use a multi-stage build:
        *   Stage 1: Use a Go build image (`golang:1.x-alpine`) to compile the application (`go build -o /app/server ./cmd/api`).
        *   Stage 2: Use a minimal base image (`alpine:latest` or `gcr.io/distroless/static-debian11`) and copy the compiled binary from Stage 1.
        *   Expose the application port (e.g., `EXPOSE 8080`).
        *   Set the `CMD` or `ENTRYPOINT` to run the compiled binary (`/app/server`).
    *   **Action:** Create `backend/Dockerfile`.

5.  **Kubernetes Manifests:**
    *   Create a `backend/k8s/` directory.
    *   Create the following YAML files:
        *   `secret.yaml` (Optional but good practice): Defines the `gcp-sa-key` secret declaratively instead of using `kubectl create`. Include this file in `.gitignore`.
        *   `configmap.yaml`: Defines a `ConfigMap` named `backend-config` containing `CORS_ALLOWED_ORIGINS` and potentially `GCP_PROJECT_ID`.
        *   `deployment.yaml`: Defines a `Deployment` that:
            *   Uses the container image built via the `Dockerfile`.
            *   Sets the `CORS_ALLOWED_ORIGINS` environment variable from the `backend-config` `ConfigMap`.
            *   **Action:** Mounts the `gcp-sa-key` secret as a volume (e.g., to `/etc/gcp-keys`).
            *   **Action:** Sets the `GOOGLE_APPLICATION_CREDENTIALS` environment variable to the path of the mounted key file (e.g., `/etc/gcp-keys/key.json`).
            *   Ensure `GCP_PROJECT_ID` is also set (via env var in Deployment or ConfigMap).
            *   (If needed) Mounts other `Secrets` for sensitive data.
            *   Configures liveness (`/healthz`) and readiness (`/readyz`) probes.
            *   Specifies the container port (e.g., 8080).
        *   `service.yaml`: Defines a `Service` (e.g., type `ClusterIP`) named `backend-service` that targets the `Deployment` pods on the application port.
        *   `ingress.yaml` (Recommended): Defines an `Ingress` resource to expose the `backend-service` externally (e.g., at `api.yourdomain.com`), potentially handling TLS. Requires an Ingress controller (like Nginx Ingress or Traefik) in the cluster.
    *   **Action:** Create Kubernetes manifests in `backend/k8s/`.

## III. Local Development Setup

*   **Option A (Direct Execution - Recommended for Simplicity):**
    *   Authenticate locally using `gcloud auth application-default login`. The backend code will pick this up automatically if `GOOGLE_APPLICATION_CREDENTIALS` is not set.
    *   Run backend: `cd backend && CORS_ALLOWED_ORIGINS="http://localhost:3000" GCP_PROJECT_ID="your-dev-project-id" go run ./cmd/api`
    *   Run frontend: `cd frontend && NEXT_PUBLIC_API_URL="http://localhost:8080" npm run dev` (Adjust ports/project ID as needed).
*   **Option B (Direct Execution - Using Service Account Key):**
    *   Authenticate locally by setting the environment variable: `export GOOGLE_APPLICATION_CREDENTIALS=/path/to/downloaded-key.json`
    *   Run backend: `cd backend && CORS_ALLOWED_ORIGINS="http://localhost:3000" GCP_PROJECT_ID="your-dev-project-id" go run ./cmd/api`
    *   Run frontend: `cd frontend && NEXT_PUBLIC_API_URL="http://localhost:8080" npm run dev`
*   **Option C (Docker Compose):**
    *   Create `docker-compose.yml` at the project root.
    *   Define services for `frontend` and `backend`.
    *   Use the `backend/Dockerfile` for the backend service.
    *   Configure environment variables (`NEXT_PUBLIC_API_URL`, `CORS_ALLOWED_ORIGINS`, `GCP_PROJECT_ID`) within the compose file.
    *   Mount the downloaded service account key file into the backend container and set `GOOGLE_APPLICATION_CREDENTIALS` to its path within the container.
    *   Manage network settings for inter-service communication.
*   **Action:** Choose and document the preferred local development strategy.

## IV. Security Considerations

*   **CORS:** Ensure `CORS_ALLOWED_ORIGINS` is strictly limited to the required frontend domains and `localhost` for local development. Do not use wildcard (`*`) in production.
*   **Service Account Key Security:** The downloaded Service Account key file is highly sensitive. **Never commit it to Git.** Store it securely. Ensure the Kubernetes `Secret` is properly managed and access is restricted.
*   **IAM Least Privilege:** Grant only the necessary permissions to the Service Account. Regularly review its permissions.
*   **Secrets Management:** Use Kubernetes Secrets for the Service Account key and any other sensitive backend configuration (database passwords, API keys).
*   **Network Policies (Kubernetes):** Consider implementing Kubernetes Network Policies to restrict traffic flow between pods if running in a multi-tenant or complex cluster environment.
*   **Ingress Security:** Secure the Ingress endpoint with TLS.

## V. Deployment Workflow

1.  **Backend:**
    *   **Action:** Ensure Service Account key is created and stored as a Kubernetes secret (`kubectl apply -f backend/k8s/secret.yaml` or imperative command).
    *   Build Docker image (`docker build -t your-registry/backend-image:tag ./backend`).
    *   Push image to a container registry accessible by Kubernetes.
    *   Apply Kubernetes manifests (`kubectl apply -f backend/k8s/`). Verify pods start correctly and can authenticate to GCP services.
2.  **Frontend:**
    *   Push code changes to the Git repository connected to Vercel.
    *   Ensure Vercel environment variables are correctly set.
    *   Vercel automatically builds and deploys.

This plan provides a structured approach. We should review and refine each step as we proceed with implementation. 