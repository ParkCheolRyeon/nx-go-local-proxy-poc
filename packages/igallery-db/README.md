# @igallery/igallery-db (Go module)

iGallery 모노레포의 PostgreSQL 스키마/쿼리/sqlc 출력을 모아둔 Go 모듈.

별도 git repository로 분리하지 않으며, 모노레포 내부에서 path-prefixed git tag로 버저닝한다.

## 구성

```
packages/igallery-db/
├── go.mod
├── sqlc.yml
├── project.json
├── README.md
├── migrations/   # golang-migrate 형식 (up/down)
├── queries/      # sqlc 입력 SQL
└── db/           # sqlc 출력 (package db)
```

## 사용 (호스트 앱에서)

```go
import "github.com/iscreamarts/igallery/packages/igallery-db/db"

q := db.New(pool)
user, err := q.GetUser(ctx, id)
```

루트 `go.work`가 `apps/dp-back`과 `packages/igallery-db`를 묶고 있으므로
로컬에서는 dp-back의 `go.mod`에 박힌 버전과 무관하게 항상 로컬 코드를 본다.

## 변경 절차

1. `queries/` 또는 `migrations/` 수정
2. `cd packages/igallery-db && sqlc generate` (또는 `nx run igallery-db:sqlc:gen`)
3. 생성된 `db/` 변경분을 함께 커밋
4. 의미 있는 단위라면 태깅:
   ```bash
   git tag packages/igallery-db/v0.2.0
   git push origin packages/igallery-db/v0.2.0
   ```

## 마이그레이션 적용

로컬:
```bash
migrate -path packages/igallery-db/migrations -database "$DATABASE_URL" up
```

배포 시점에는 dp-back 컨테이너의 `entrypoint.sh migrate up`이 적용한다
(별도 마이그레이션 파이프라인 분리는 후속 과제).
