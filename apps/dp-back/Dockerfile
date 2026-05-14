# syntax=docker/dockerfile:1.7
#
# Build context: monorepo root (igallery/).
# 호출 예: docker buildx build -f apps/dp-back/Dockerfile . -t ...

FROM golang:1.26-alpine AS builder
WORKDIR /src

# go.mod / go.sum 만 먼저 복사 — 의존성 다운로드 레이어 분리
COPY apps/dp-back/go.mod apps/dp-back/go.sum apps/dp-back/
RUN cd apps/dp-back && go mod download

# 외부 igallery-db module 캐시에서 migrations 추출
# (go list -m 이 go.mod 의 정확한 버전을 반영하므로 별도 ARG 불필요)
RUN cd apps/dp-back && \
    IGDB_DIR=$(go list -m -f '{{.Dir}}' github.com/ParkCheolRyeon/igallery-db) && \
    cp -r "$IGDB_DIR/migrations" /migrations

# dp-back 소스 복사 + 빌드
COPY apps/dp-back/ apps/dp-back/
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
COPY --from=builder /migrations /migrations
COPY apps/dp-back/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

USER app
EXPOSE 8080

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
