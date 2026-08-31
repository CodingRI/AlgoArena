FROM golang:1.27-bookworm AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /server ./cmd/server

FROM debian:bookworm-slim
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /server /app/server

ENV GIN_MODE=release

# Render injects PORT. The binary already reads it (default 8080 locally).
EXPOSE 8080

CMD ["./server"]
