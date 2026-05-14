# syntax=docker/dockerfile:1.7
#
# Build context: monorepo root (igallery/).
# 호출 예: docker buildx build -f apps/dp-back/Dockerfile . -t ...

FROM golang:1.26-alpine AS builder
WORKDIR /src

# go.work 및 두 모듈의 go.mod/go.sum 만 먼저 복사 — 의존성 다운로드 캐시 레이어 분리
COPY go.work go.work.sum* ./
COPY apps/dp-back/go.mod apps/dp-back/go.sum apps/dp-back/
COPY packages/igallery-db/go.mod packages/igallery-db/go.sum packages/igallery-db/
RUN cd apps/dp-back && go mod download

# 전체 소스 복사 (apps/dp-back 과 packages/igallery-db 만 필요)
COPY apps/dp-back/        apps/dp-back/
COPY packages/igallery-db/ packages/igallery-db/

RUN cd apps/dp-back && CGO_ENABLED=0 GOOS=linux go build -ldflags='-s -w' -o /out/dp-back .

# ── 런타임 이미지
FROM alpine:3.20

RUN apk add --no-cache ca-certificates tzdata curl && \
    curl -L https://github.com/golang-migrate/migrate/releases/download/v4.18.1/migrate.linux-arm64.tar.gz \
    | tar xvz -C /usr/local/bin migrate && \
    chmod +x /usr/local/bin/migrate && \
    apk del curl && \
    addgroup -S app && adduser -S app -G app

COPY --from=builder /out/dp-back /usr/local/bin/dp-back
# 마이그레이션은 igallery-db 패키지가 보유
COPY packages/igallery-db/migrations /migrations
COPY apps/dp-back/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

USER app
EXPOSE 8080

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
