package server

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/danielgtaylor/huma/v2"
	"github.com/ParkCheolRyeon/igallery-db/db"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

const maxChildrenPerUser = 5

type Child struct {
	ID           string    `json:"id"           example:"a3f2c891d4b7e0f1"`
	Name         string    `json:"name"         example:"짱구"`
	BirthDate    string    `json:"birthDate"    example:"2022-01-02"`
	ProfileEmoji string    `json:"profileEmoji" example:"lion"`
	DrawingLevel string    `json:"drawingLevel" example:"beginner"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

func toChild(c db.ChildProfile) Child {
	return Child{
		ID:           c.ID,
		Name:         c.Name,
		BirthDate:    c.BirthDate.Time.Format("2006-01-02"),
		ProfileEmoji: c.ProfileEmoji,
		DrawingLevel: c.DrawingLevel,
		CreatedAt:    c.CreatedAt.Time,
		UpdatedAt:    c.UpdatedAt.Time,
	}
}

// parseBirthDate - "YYYY-MM-DD" 문자열을 pgtype.Date로 변환
func parseBirthDate(s string) (pgtype.Date, error) {
	t, err := time.Parse("2006-01-02", s)
	if err != nil {
		return pgtype.Date{}, err
	}
	return pgtype.Date{Time: t, Valid: true}, nil
}

// ListChildren — GET /children
type ListChildrenOutput struct {
	Body struct {
		Items []Child `json:"items"`
	}
}

func (s *Server) ListChildren(ctx context.Context, _ *struct{}) (*ListChildrenOutput, error) {
	userID, err := userIDFromContext(ctx)
	if err != nil {
		return nil, huma.Error401Unauthorized("not authenticated")
	}

	rows, err := s.queries.ListChildProfilesByUser(ctx, userID)
	if err != nil {
		return nil, huma.Error500InternalServerError("DB query failed", err)
	}

	// 빈 배열도 [] 로 직렬화 되도록 nil 대신 0-length slice 사용
	items := make([]Child, 0, len(rows))
	for _, r := range rows {
		items = append(items, toChild(r))
	}

	out := &ListChildrenOutput{}
	out.Body.Items = items
	return out, nil
}

// GetChild — GET /children/{id}
type GetChildInput struct {
	ID string `path:"id"`
}

type ChildOutput struct {
	Body Child
}

func (s *Server) GetChild(ctx context.Context, input *GetChildInput) (*ChildOutput, error) {
	userID, err := userIDFromContext(ctx)
	if err != nil {
		return nil, huma.Error401Unauthorized("not authenticated")
	}

	row, err := s.queries.GetChildProfile(ctx, db.GetChildProfileParams{
		ID:     input.ID,
		UserID: userID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, huma.Error404NotFound("자녀 프로필을 찾을 수 없습니다.")
		}
		return nil, huma.Error500InternalServerError("DB query failed", err)
	}

	return &ChildOutput{Body: toChild(row)}, nil
}

// CreateChild — POST /children
// 가족 계정당 자녀 프로필은 최대 5명까지 (igallery-dp.md §3 정책)
type CreateChildInput struct {
	Body struct {
		Name         string `json:"name"         minLength:"1" maxLength:"50"                                          example:"짱구"`
		BirthDate    string `json:"birthDate"    format:"date"                                                         example:"2022-01-02"`
		ProfileEmoji string `json:"profileEmoji" enum:"lion,bear,rabbit,panda,fox,dog,cat,unikorn"                     example:"lion"`
		DrawingLevel string `json:"drawingLevel" enum:"beginner,intermediate,expert"                                   example:"beginner"`
	}
}

func (s *Server) CreateChild(ctx context.Context, input *CreateChildInput) (*ChildOutput, error) {
	userID, err := userIDFromContext(ctx)
	if err != nil {
		return nil, huma.Error401Unauthorized("not authenticated")
	}

	count, err := s.queries.CountActiveChildProfilesByUser(ctx, userID)
	if err != nil {
		return nil, huma.Error500InternalServerError("DB query failed", err)
	}
	if count >= maxChildrenPerUser {
		return nil, huma.Error400BadRequest("자녀 프로필은 최대 5명까지 등록할 수 있습니다.")
	}

	birthDate, err := parseBirthDate(input.Body.BirthDate)
	if err != nil {
		return nil, huma.Error400BadRequest("생년월일 형식이 올바르지 않습니다 (YYYY-MM-DD).")
	}

	row, err := s.queries.CreateChildProfile(ctx, db.CreateChildProfileParams{
		ID:           generateID(),
		UserID:       userID,
		Name:         strings.TrimSpace(input.Body.Name),
		BirthDate:    birthDate,
		ProfileEmoji: input.Body.ProfileEmoji,
		DrawingLevel: input.Body.DrawingLevel,
	})
	if err != nil {
		return nil, huma.Error500InternalServerError("child insert failed", err)
	}

	return &ChildOutput{Body: toChild(row)}, nil
}

// UpdateChild — PATCH /children/{id}
// 모든 필드 optional. 보낸 필드만 갱신 (sqlc COALESCE).
type UpdateChildInput struct {
	ID   string `path:"id"`
	Body struct {
		Name         *string `json:"name,omitempty"         minLength:"1" maxLength:"50"`
		BirthDate    *string `json:"birthDate,omitempty"    format:"date"`
		ProfileEmoji *string `json:"profileEmoji,omitempty" enum:"lion,bear,rabbit,panda,fox,dog,cat,unikorn"`
		DrawingLevel *string `json:"drawingLevel,omitempty" enum:"beginner,intermediate,expert"`
	}
}

func (s *Server) UpdateChild(ctx context.Context, input *UpdateChildInput) (*ChildOutput, error) {
	userID, err := userIDFromContext(ctx)
	if err != nil {
		return nil, huma.Error401Unauthorized("not authenticated")
	}

	params := db.UpdateChildProfileParams{
		ID:           input.ID,
		UserID:       userID,
		ProfileEmoji: input.Body.ProfileEmoji,
		DrawingLevel: input.Body.DrawingLevel,
	}

	if input.Body.Name != nil {
		trimmed := strings.TrimSpace(*input.Body.Name)
		params.Name = &trimmed
	}

	if input.Body.BirthDate != nil {
		bd, err := parseBirthDate(*input.Body.BirthDate)
		if err != nil {
			return nil, huma.Error400BadRequest("생년월일 형식이 올바르지 않습니다 (YYYY-MM-DD).")
		}
		params.BirthDate = bd
	}

	row, err := s.queries.UpdateChildProfile(ctx, params)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, huma.Error404NotFound("자녀 프로필을 찾을 수 없습니다.")
		}
		return nil, huma.Error500InternalServerError("child update failed", err)
	}

	return &ChildOutput{Body: toChild(row)}, nil
}

// DeleteChild — DELETE /children/{id}
// soft delete (deleted_at = NOW). 이미 삭제됐거나 없는 id 도 idempotent 하게 204.
type DeleteChildInput struct {
	ID string `path:"id"`
}

func (s *Server) DeleteChild(ctx context.Context, input *DeleteChildInput) (*struct{}, error) {
	userID, err := userIDFromContext(ctx)
	if err != nil {
		return nil, huma.Error401Unauthorized("not authenticated")
	}

	if err := s.queries.SoftDeleteChildProfile(ctx, db.SoftDeleteChildProfileParams{
		ID:     input.ID,
		UserID: userID,
	}); err != nil {
		return nil, huma.Error500InternalServerError("child delete failed", err)
	}

	return nil, nil
}
