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
)

// Domain
type User struct {
	ID        string    `json:"id" example:"a3f2c891d4b7e0f1"`
	Name      string    `json:"name" example:"련철박"`
	CreatedAt time.Time `json:"createdAt"`
}

func toDomain(u db.User) User {
	return User{
		ID:        u.ID,
		Name:      u.Name,
		CreatedAt: u.CreatedAt,
	}
}

// Server
type Server struct {
	queries *db.Queries
}

func New(pool *pgxpool.Pool) *Server {
	return &Server{
		queries: db.New(pool),
	}
}

func generateID() string {
	b := make([]byte, 8)
	rand.Read(b)
	return hex.EncodeToString(b)
}

// API Setup
func NewAPI(r *gin.Engine) huma.API {
	config := huma.DefaultConfig("iGallery DP API", "0.1.0")
	return humagin.New(r, config)
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
}

// Handlers
type HealthOutput struct {
	Body struct {
		Status string `json:"status" enum:"ok" example:"ok"`
	}
}

func (s *Server) GetHealth(ctx context.Context, _ *struct{}) (*HealthOutput, error) {
	out := &HealthOutput{}
	out.Body.Status = "ok"
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
