# ── Build stage ───────────────────────────────────────────────────────────────
FROM golang:1.24-alpine AS builder

WORKDIR /app

# Cache dependency downloads
COPY go.mod go.sum ./
RUN go mod download

# Build a statically-linked binary
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /stonksapi .

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM alpine:3.21

# CA certs are needed for outbound HTTPS (Google Finance scraping)
RUN apk add --no-cache ca-certificates

WORKDIR /app
COPY --from=builder /stonksapi .

EXPOSE 8084

ENTRYPOINT ["./stonksapi"]
