package server

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"time"

	"github.com/danielgtaylor/huma/v2"
	"github.com/danielgtaylor/huma/v2/adapters/humagin"
	"github.com/gin-gonic/gin"
	"github.com/iscreamarts/igallery/dp-back/internal/db"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

// Domain
type User struct {
	ID        string    `json:"id" example:"a3f2c891d4b7e0f1"`
	Email     string    `json:"email" format:"email" example:"parkcr@example.com"`
	Name      string    `json:"name" example:"련철박"`
	Locale    string    `json:"locale" enum:"ko,en,ja" example:"ko"`
	Country   string    `json:"country" example:"KR"`
	CreatedAt time.Time `json:"createdAt"`
}

func toDomain(u db.User) User {
	email := ""
	if u.Email != nil {
		email = *u.Email
	}
	return User{
		ID:        u.ID,
		Email:     email,
		Name:      u.Name,
		Locale:    u.Locale,
		Country:   u.Country,
		CreatedAt: u.CreatedAt,
	}
}

// Server
type Server struct {
	pool      *pgxpool.Pool
	queries   *db.Queries
	jwtSecret []byte
	redis     *redis.Client
}

func New(pool *pgxpool.Pool, redisClient *redis.Client, jwtSecret string) *Server {
	return &Server{
		pool:      pool,
		queries:   db.New(pool),
		jwtSecret: []byte(jwtSecret),
		redis:     redisClient,
	}
}

func generateID() string {
	b := make([]byte, 8)
	rand.Read(b)
	return hex.EncodeToString(b)
}

// API Setup
func NewAPI(r *gin.Engine, s *Server) huma.API {
	config := huma.DefaultConfig("iGallery DP API", "0.1.0")

	config.Components.SecuritySchemes = map[string]*huma.SecurityScheme{
		"bearer": {
			Type:         "http",
			Scheme:       "bearer",
			BearerFormat: "JWT",
		},
	}

	api := humagin.New(r, config)
	api.UseMiddleware(s.AuthMiddleware(api))

	return api
}

func RegisterRoutes(api huma.API, s *Server) {
	huma.Register(api, huma.Operation{
		OperationID: "getHealth",
		Method:      "GET",
		Path:        "/health",
		Summary:     "헬스 체크",
		Tags:        []string{"system"},
	}, s.GetHealth)

	huma.Register(api, huma.Operation{
		OperationID:   "createUser",
		Method:        "POST",
		Path:          "/users",
		Summary:       "사용자 생성",
		Tags:          []string{"users"},
		DefaultStatus: 201,
	}, s.CreateUser)

	huma.Register(api, huma.Operation{
		OperationID: "getUser",
		Method:      "GET",
		Path:        "/users/{id}",
		Summary:     "사용자 단건 조회",
		Tags:        []string{"users"},
	}, s.GetUser)

	huma.Register(api, huma.Operation{
		OperationID:   "signUp",
		Method:        "POST",
		Path:          "/auth/signup",
		Summary:       "회원가입",
		Tags:          []string{"auth"},
		DefaultStatus: 201,
	}, s.SignUp)

	huma.Register(api, huma.Operation{
		OperationID: "signIn",
		Method:      "POST",
		Path:        "/auth/signin",
		Summary:     "로그인 (access + refresh 발급)",
		Tags:        []string{"auth"},
	}, s.SignIn)

	huma.Register(api, huma.Operation{
		OperationID: "refreshToken",
		Method:      "POST",
		Path:        "/auth/refresh",
		Summary:     "refresh 토큰 회전 (새 access + 새 refresh)",
		Tags:        []string{"auth"},
	}, s.Refresh)

	huma.Register(api, huma.Operation{
		OperationID:   "logout",
		Method:        "POST",
		Path:          "/auth/logout",
		Summary:       "로그아웃 (access 블랙리스트 + refresh 폐기)",
		Tags:          []string{"auth"},
		Security:      []map[string][]string{{"bearer": {}}},
		DefaultStatus: 204,
	}, s.Logout)

	huma.Register(api, huma.Operation{
		OperationID:   "changePassword",
		Method:        "POST",
		Path:          "/auth/password",
		Summary:       "비밀번호 변경 (모든 세션 폐기)",
		Tags:          []string{"auth"},
		Security:      []map[string][]string{{"bearer": {}}},
		DefaultStatus: 204,
	}, s.ChangePassword)

	huma.Register(api, huma.Operation{
		OperationID: "getMe",
		Method:      "GET",
		Path:        "/me",
		Summary:     "내 정보 조회",
		Tags:        []string{"users"},
		Security:    []map[string][]string{{"bearer": {}}},
	}, s.GetMe)

	huma.Register(api, huma.Operation{
		OperationID: "patchMe",
		Method:      "PATCH",
		Path:        "/me",
		Summary:     "내 정보 부분 갱신 (locale / country)",
		Tags:        []string{"users"},
		Security:    []map[string][]string{{"bearer": {}}},
	}, s.PatchMe)

	huma.Register(api, huma.Operation{
		OperationID: "getMyPreferences",
		Method:      "GET",
		Path:        "/me/preferences",
		Summary:     "내 환경설정 조회 (notif/dnd/safe/payment/together)",
		Tags:        []string{"users"},
		Security:    []map[string][]string{{"bearer": {}}},
	}, s.GetMyPreferences)

	huma.Register(api, huma.Operation{
		OperationID: "patchMyPreferences",
		Method:      "PATCH",
		Path:        "/me/preferences",
		Summary:     "내 환경설정 부분 갱신",
		Tags:        []string{"users"},
		Security:    []map[string][]string{{"bearer": {}}},
	}, s.PatchMyPreferences)

	huma.Register(api, huma.Operation{
		OperationID:   "createSupportInquiry",
		Method:        "POST",
		Path:          "/support-inquiries",
		Summary:       "1:1 문의 등록",
		Tags:          []string{"support"},
		Security:      []map[string][]string{{"bearer": {}}},
		DefaultStatus: 201,
	}, s.CreateSupportInquiry)

	huma.Register(api, huma.Operation{
		OperationID: "listChildren",
		Method:      "GET",
		Path:        "/children",
		Summary:     "자녀 프로필 목록 조회",
		Tags:        []string{"children"},
		Security:    []map[string][]string{{"bearer": {}}},
	}, s.ListChildren)

	huma.Register(api, huma.Operation{
		OperationID: "getChild",
		Method:      "GET",
		Path:        "/children/{id}",
		Summary:     "자녀 프로필 단건 조회",
		Tags:        []string{"children"},
		Security:    []map[string][]string{{"bearer": {}}},
	}, s.GetChild)

	huma.Register(api, huma.Operation{
		OperationID:   "createChild",
		Method:        "POST",
		Path:          "/children",
		Summary:       "자녀 프로필 생성 (가족당 최대 5명)",
		Tags:          []string{"children"},
		Security:      []map[string][]string{{"bearer": {}}},
		DefaultStatus: 201,
	}, s.CreateChild)

	huma.Register(api, huma.Operation{
		OperationID: "updateChild",
		Method:      "PATCH",
		Path:        "/children/{id}",
		Summary:     "자녀 프로필 수정 (partial)",
		Tags:        []string{"children"},
		Security:    []map[string][]string{{"bearer": {}}},
	}, s.UpdateChild)

	huma.Register(api, huma.Operation{
		OperationID:   "deleteChild",
		Method:        "DELETE",
		Path:          "/children/{id}",
		Summary:       "자녀 프로필 삭제 (soft delete)",
		Tags:          []string{"children"},
		Security:      []map[string][]string{{"bearer": {}}},
		DefaultStatus: 204,
	}, s.DeleteChild)

	huma.Register(api, huma.Operation{
		OperationID: "getCoinWallet",
		Method:      "GET",
		Path:        "/coins/wallet",
		Summary:     "내 코인 지갑 조회",
		Tags:        []string{"coins"},
		Security:    []map[string][]string{{"bearer": {}}},
	}, s.GetMyCoinWallet)

	// drawings -----------------------------------------------------------------
	huma.Register(api, huma.Operation{
		OperationID: "listDrawings",
		Method:      "GET",
		Path:        "/children/{id}/drawings",
		Summary:     "자녀별 그림 목록 (보관함/공개작품/캘린더)",
		Tags:        []string{"drawings"},
		Security:    []map[string][]string{{"bearer": {}}},
	}, s.ListDrawings)

	huma.Register(api, huma.Operation{
		OperationID: "getDrawing",
		Method:      "GET",
		Path:        "/drawings/{id}",
		Summary:     "그림 단건 조회",
		Tags:        []string{"drawings"},
		Security:    []map[string][]string{{"bearer": {}}},
	}, s.GetDrawing)

	huma.Register(api, huma.Operation{
		OperationID:   "createDrawing",
		Method:        "POST",
		Path:          "/drawings",
		Summary:       "그림 생성 (dev seed; R7/R8 캔버스로 대체 예정)",
		Tags:          []string{"drawings"},
		Security:      []map[string][]string{{"bearer": {}}},
		DefaultStatus: 201,
	}, s.CreateDrawing)

	huma.Register(api, huma.Operation{
		OperationID: "updateDrawing",
		Method:      "PATCH",
		Path:        "/drawings/{id}",
		Summary:     "그림 수정 (title/isPublic/status)",
		Tags:        []string{"drawings"},
		Security:    []map[string][]string{{"bearer": {}}},
	}, s.UpdateDrawing)

	huma.Register(api, huma.Operation{
		OperationID:   "deleteDrawing",
		Method:        "DELETE",
		Path:          "/drawings/{id}",
		Summary:       "그림 삭제 (soft delete)",
		Tags:          []string{"drawings"},
		Security:      []map[string][]string{{"bearer": {}}},
		DefaultStatus: 204,
	}, s.DeleteDrawing)

	// awards -------------------------------------------------------------------
	huma.Register(api, huma.Operation{
		OperationID: "listAwards",
		Method:      "GET",
		Path:        "/children/{id}/awards",
		Summary:     "자녀별 수상작 목록",
		Tags:        []string{"awards"},
		Security:    []map[string][]string{{"bearer": {}}},
	}, s.ListAwards)

	huma.Register(api, huma.Operation{
		OperationID:   "createAward",
		Method:        "POST",
		Path:          "/awards",
		Summary:       "수상 등록 (dev seed; R13 모더레이션으로 대체 예정)",
		Tags:          []string{"awards"},
		Security:      []map[string][]string{{"bearer": {}}},
		DefaultStatus: 201,
	}, s.CreateAward)

	// notifications -----------------------------------------------------------
	huma.Register(api, huma.Operation{
		OperationID: "listNotifications",
		Method:      "GET",
		Path:        "/notifications",
		Summary:     "내 알림 목록 (+ 미확인 수)",
		Tags:        []string{"notifications"},
		Security:    []map[string][]string{{"bearer": {}}},
	}, s.ListNotifications)

	huma.Register(api, huma.Operation{
		OperationID:   "markNotificationRead",
		Method:        "PATCH",
		Path:          "/notifications/{id}/read",
		Summary:       "알림 읽음 처리 (단건)",
		Tags:          []string{"notifications"},
		Security:      []map[string][]string{{"bearer": {}}},
		DefaultStatus: 204,
	}, s.MarkNotificationRead)

	huma.Register(api, huma.Operation{
		OperationID:   "markAllNotificationsRead",
		Method:        "PATCH",
		Path:          "/notifications/read-all",
		Summary:       "알림 전체 읽음 처리",
		Tags:          []string{"notifications"},
		Security:      []map[string][]string{{"bearer": {}}},
		DefaultStatus: 204,
	}, s.MarkAllNotificationsRead)

	huma.Register(api, huma.Operation{
		OperationID:   "createNotification",
		Method:        "POST",
		Path:          "/notifications",
		Summary:       "알림 생성 (dev seed; R12/R13 시스템 트리거로 대체 예정)",
		Tags:          []string{"notifications"},
		Security:      []map[string][]string{{"bearer": {}}},
		DefaultStatus: 201,
	}, s.CreateNotification)

	// push tokens -------------------------------------------------------------
	huma.Register(api, huma.Operation{
		OperationID: "registerPushToken",
		Method:      "POST",
		Path:        "/push-tokens",
		Summary:     "푸시 토큰 등록 (idempotent — 같은 token 재등록 시 last_seen 만 갱신)",
		Tags:        []string{"push-tokens"},
		Security:    []map[string][]string{{"bearer": {}}},
	}, s.RegisterPushToken)

	huma.Register(api, huma.Operation{
		OperationID:   "unregisterPushToken",
		Method:        "DELETE",
		Path:          "/push-tokens",
		Summary:       "푸시 토큰 폐기",
		Tags:          []string{"push-tokens"},
		Security:      []map[string][]string{{"bearer": {}}},
		DefaultStatus: 204,
	}, s.UnregisterPushToken)
}

// Handlers
type HealthOutput struct {
	Body struct {
		Status  string `json:"status" enum:"ok" example:"ok"`
		Version string `json:"version" example:"v0.0.3"`
	}
}

func (s *Server) GetHealth(ctx context.Context, _ *struct{}) (*HealthOutput, error) {
	out := &HealthOutput{}
	out.Body.Status = "ok"
	out.Body.Version = "v0.0.3"
	return out, nil
}

type CreateUserInput struct {
	Body struct {
		Name string `json:"name" minLength:"1" maxLength:"50" example:"련철박"`
	}
}

type UserOutput struct {
	Body User
}

func (s *Server) CreateUser(ctx context.Context, input *CreateUserInput) (*UserOutput, error) {
	dbUser, err := s.queries.CreateUser(ctx, db.CreateUserParams{
		ID:   generateID(),
		Name: input.Body.Name,
	})
	if err != nil {
		return nil, huma.Error500InternalServerError("DB insert failed", err)
	}
	return &UserOutput{Body: toDomain(dbUser)}, nil
}

type GetUserInput struct {
	ID string `path:"id"`
}

func (s *Server) GetUser(ctx context.Context, input *GetUserInput) (*UserOutput, error) {
	dbUser, err := s.queries.GetUser(ctx, input.ID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, huma.Error404NotFound("사용자를 찾을 수 없습니다.")
		}
		return nil, huma.Error500InternalServerError("DB query failed", err)
	}
	return &UserOutput{Body: toDomain(dbUser)}, nil
}
