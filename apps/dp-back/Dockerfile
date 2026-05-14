# syntax=docker/dockerfile:1.7
#
# Build context: monorepo root (igallery/).
# 호출 예: docker buildx build -f apps/dp-back/Dockerfile . -t ...

FROM golang:1.26-alpine AS builder
WORKDIR /src

# go.mod / go.sum 만 먼저 복사 — 의존성 다운로드 레이어 분리
COPY apps/dp-back/go.mod apps/dp-back/go.sum apps/dp-back/
RUN cd apps/dp-back && go mod download

# 소스 복사 + 빌드
COPY apps/dp-back/ apps/dp-back/
RUN cd apps/dp-back && CGO_ENABLED=0 GOOS=linux go build -ldflags='-s -w' -o /out/dp-back .

# ── 런타임 이미지
# 마이그레이션 책임은 igallery-db repo 의 migrate.yml 워크플로우가 별도로 진행한다.
# 따라서 이 이미지엔 golang-migrate / migrations 가 더 이상 포함되지 않는다.
FROM alpine:3.20

RUN apk add --no-cache ca-certificates tzdata && \
    addgroup -S app && adduser -S app -G app

COPY --from=builder /out/dp-back /usr/local/bin/dp-back
COPY apps/dp-back/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

USER app
EXPOSE 8080

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
