# ---- Build stage ----
FROM golang:1.24-alpine AS builder

WORKDIR /app

# Install dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy source
COPY . .

# Build binary
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -ldflags="-w -s" -o /app/server ./cmd/server

# ---- Runtime stage ----
FROM alpine:3.22

# Install CA certificates for HTTPS calls (Supabase, R2)
RUN apk --no-cache add ca-certificates tzdata

WORKDIR /app

COPY --from=builder /app/server /app/server

# Run as non-root
RUN adduser -D -g '' appuser
USER appuser

EXPOSE 8080

ENTRYPOINT ["/app/server"]
