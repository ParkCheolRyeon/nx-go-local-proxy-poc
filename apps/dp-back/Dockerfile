# syntax=docker/dockerfile:1.7

FROM golang:1.26-alpine AS builder
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags='-s -w' -o /out/dp-back .

FROM alpine:3.20

RUN apk add --no-cache ca-certificates tzdata curl && \
    curl -L https://github.com/golang-migrate/migrate/releases/download/v4.18.1/migrate.linux-arm64.tar.gz \
    | tar xvz -C /usr/local/bin migrate && \
    chmod +x /usr/local/bin/migrate && \
    apk del curl && \
    addgroup -S app && adduser -S app -G app

COPY --from=builder /out/dp-back /usr/local/bin/dp-back
COPY db/migrations /migrations
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

USER app
EXPOSE 8080

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]