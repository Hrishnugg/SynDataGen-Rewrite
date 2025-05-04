# ---- Build Stage ----
# Use an official Go image as a builder.
# Using Alpine variant for smaller image size during build.
# Update Go version to match go.mod requirement
FROM golang:1.23-alpine AS builder

# Set the Current Working Directory inside the container
WORKDIR /app

# Copy go mod and sum files
COPY go.mod go.sum ./

# Download all dependencies. Dependencies will be cached if the go.mod and go.sum files are not changed
RUN go mod download

# Copy the source code into the container
COPY . .

# Build the Go app. 
# -ldflags "-w -s" reduces the size of the binary.
# CGO_ENABLED=0 is crucial for building a static binary suitable for distroless images.
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags "-w -s" -o /server ./cmd/api

# ---- Final Stage ----
# Use a distroless static image for a minimal runtime environment.
FROM gcr.io/distroless/static-debian11

# Copy the Pre-built binary file from the previous stage
COPY --from=builder /server /server

# Expose port 8080 to the outside world
EXPOSE 8080

# Command to run the executable
ENTRYPOINT ["/server"] 