package server

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/danielgtaylor/huma/v2"
	"github.com/iscreamarts/igallery/packages/igallery-db/db"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

// Drawing — 도메인 표현. R7/R8 캔버스 합류 시 mode 별 추가 메타가 붙을 수 있음.
type Drawing struct {
	ID             string     `json:"id"             example:"a3f2c891d4b7e0f1"`
	ChildProfileID string     `json:"childProfileId"`
	Mode           string     `json:"mode"           enum:"coloring,stepwise,freeform,together"`
	Title          string     `json:"title"`
	ThumbnailURL   string     `json:"thumbnailUrl,omitempty"`
	ImageURL       string     `json:"imageUrl,omitempty"`
	TimelapseURL   string     `json:"timelapseUrl,omitempty"`
	IsPublic       bool       `json:"isPublic"`
	Status         string     `json:"status"         enum:"in_progress,completed"`
	StartedAt      time.Time  `json:"startedAt"`
	CompletedAt    *time.Time `json:"completedAt,omitempty"`
	CreatedAt      time.Time  `json:"createdAt"`
	UpdatedAt      time.Time  `json:"updatedAt"`
}

func toDrawing(d db.Drawing) Drawing {
	out := Drawing{
		ID:             d.ID,
		ChildProfileID: d.ChildProfileID,
		Mode:           d.Mode,
		Title:          d.Title,
		IsPublic:       d.IsPublic,
		Status:         d.Status,
		StartedAt:      d.StartedAt.Time,
		CreatedAt:      d.CreatedAt.Time,
		UpdatedAt:      d.UpdatedAt.Time,
	}
	if d.ThumbnailUrl != nil {
		out.ThumbnailURL = *d.ThumbnailUrl
	}
	if d.ImageUrl != nil {
		out.ImageURL = *d.ImageUrl
	}
	if d.TimelapseUrl != nil {
		out.TimelapseURL = *d.TimelapseUrl
	}
	if d.CompletedAt.Valid {
		t := d.CompletedAt.Time
		out.CompletedAt = &t
	}
	return out
}

// parseMonth — "YYYY-MM" → [start, end) UTC. 잘못된 형식이면 (zero,zero,err).
func parseMonth(s string) (start, end pgtype.Timestamptz, err error) {
	t, err := time.Parse("2006-01", s)
	if err != nil {
		return pgtype.Timestamptz{}, pgtype.Timestamptz{}, err
	}
	startTime := time.Date(t.Year(), t.Month(), 1, 0, 0, 0, 0, time.UTC)
	endTime := startTime.AddDate(0, 1, 0)
	return pgtype.Timestamptz{Time: startTime, Valid: true},
		pgtype.Timestamptz{Time: endTime, Valid: true},
		nil
}

func nullableString(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

// ListDrawings — GET /children/{id}/drawings
type ListDrawingsInput struct {
	ChildID    string `path:"id"`
	Status     string `query:"status"     enum:",in_progress,completed"`
	Visibility string `query:"visibility" enum:",public"`
	Month      string `query:"month"      example:"2026-04" pattern:"^\\d{4}-\\d{2}$|^$"`
	Limit      int32  `query:"limit"      minimum:"1" maximum:"100" default:"50"`
	Offset     int32  `query:"offset"     minimum:"0" default:"0"`
}

type ListDrawingsOutput struct {
	Body struct {
		Items []Drawing `json:"items"`
	}
}

func (s *Server) ListDrawings(ctx context.Context, input *ListDrawingsInput) (*ListDrawingsOutput, error) {
	userID, err := userIDFromContext(ctx)
	if err != nil {
		return nil, huma.Error401Unauthorized("not authenticated")
	}

	params := db.ListDrawingsByChildParams{
		ChildProfileID: input.ChildID,
		UserID:         userID,
		Status:         nullableString(input.Status),
		Lim:            input.Limit,
		Off:            input.Offset,
	}

	if input.Visibility == "public" {
		t := true
		params.OnlyPublic = &t
	}

	if input.Month != "" {
		start, end, err := parseMonth(input.Month)
		if err != nil {
			return nil, huma.Error400BadRequest("month 는 YYYY-MM 형식이어야 합니다.")
		}
		params.MonthStart = start
		params.MonthEnd = end
	}

	rows, err := s.queries.ListDrawingsByChild(ctx, params)
	if err != nil {
		return nil, huma.Error500InternalServerError("DB query failed", err)
	}

	items := make([]Drawing, 0, len(rows))
	for _, r := range rows {
		items = append(items, toDrawing(r))
	}

	out := &ListDrawingsOutput{}
	out.Body.Items = items
	return out, nil
}

// GetDrawing — GET /drawings/{id}
type GetDrawingInput struct {
	ID string `path:"id"`
}

type DrawingOutput struct {
	Body Drawing
}

func (s *Server) GetDrawing(ctx context.Context, input *GetDrawingInput) (*DrawingOutput, error) {
	userID, err := userIDFromContext(ctx)
	if err != nil {
		return nil, huma.Error401Unauthorized("not authenticated")
	}

	row, err := s.queries.GetDrawing(ctx, db.GetDrawingParams{
		ID:     input.ID,
		UserID: userID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, huma.Error404NotFound("그림을 찾을 수 없습니다.")
		}
		return nil, huma.Error500InternalServerError("DB query failed", err)
	}

	return &DrawingOutput{Body: toDrawing(row)}, nil
}

// CreateDrawing — POST /drawings  (dev seed; R7/R8 에서 정식 캔버스 흐름으로 대체)
type CreateDrawingInput struct {
	Body struct {
		ChildProfileID string `json:"childProfileId" minLength:"1"`
		Mode           string `json:"mode"           enum:"coloring,stepwise,freeform,together"`
		Title          string `json:"title,omitempty" maxLength:"80"`
		ThumbnailURL   string `json:"thumbnailUrl,omitempty"`
		ImageURL       string `json:"imageUrl,omitempty"`
		TimelapseURL   string `json:"timelapseUrl,omitempty"`
		IsPublic       bool   `json:"isPublic,omitempty"`
		Status         string `json:"status,omitempty" enum:",in_progress,completed"`
	}
}

func (s *Server) CreateDrawing(ctx context.Context, input *CreateDrawingInput) (*DrawingOutput, error) {
	userID, err := userIDFromContext(ctx)
	if err != nil {
		return nil, huma.Error401Unauthorized("not authenticated")
	}

	// 자녀 소유권 검증
	if _, err := s.queries.GetChildProfile(ctx, db.GetChildProfileParams{
		ID:     input.Body.ChildProfileID,
		UserID: userID,
	}); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, huma.Error404NotFound("자녀 프로필을 찾을 수 없습니다.")
		}
		return nil, huma.Error500InternalServerError("DB query failed", err)
	}

	status := strings.TrimSpace(input.Body.Status)
	if status == "" {
		status = "in_progress"
	}
	title := strings.TrimSpace(input.Body.Title)
	if title == "" {
		title = "제목 없음"
	}

	var completedAt pgtype.Timestamptz
	if status == "completed" {
		completedAt = pgtype.Timestamptz{Time: time.Now(), Valid: true}
	}

	row, err := s.queries.CreateDrawing(ctx, db.CreateDrawingParams{
		ID:             generateID(),
		ChildProfileID: input.Body.ChildProfileID,
		Mode:           input.Body.Mode,
		Title:          title,
		ThumbnailUrl:   nullableString(input.Body.ThumbnailURL),
		ImageUrl:       nullableString(input.Body.ImageURL),
		TimelapseUrl:   nullableString(input.Body.TimelapseURL),
		IsPublic:       input.Body.IsPublic,
		Status:         status,
		CompletedAt:    completedAt,
	})
	if err != nil {
		return nil, huma.Error500InternalServerError("drawing insert failed", err)
	}

	return &DrawingOutput{Body: toDrawing(row)}, nil
}

// UpdateDrawing — PATCH /drawings/{id}
type UpdateDrawingInput struct {
	ID   string `path:"id"`
	Body struct {
		Title    *string `json:"title,omitempty"    maxLength:"80"`
		IsPublic *bool   `json:"isPublic,omitempty"`
		Status   *string `json:"status,omitempty"   enum:"in_progress,completed"`
	}
}

func (s *Server) UpdateDrawing(ctx context.Context, input *UpdateDrawingInput) (*DrawingOutput, error) {
	userID, err := userIDFromContext(ctx)
	if err != nil {
		return nil, huma.Error401Unauthorized("not authenticated")
	}

	params := db.UpdateDrawingParams{
		ID:       input.ID,
		UserID:   userID,
		IsPublic: input.Body.IsPublic,
		Status:   input.Body.Status,
	}

	if input.Body.Title != nil {
		t := strings.TrimSpace(*input.Body.Title)
		params.Title = &t
	}
	// status='completed' 로 전이 시 completed_at 도 같이 세팅 (CHECK 통과)
	if input.Body.Status != nil && *input.Body.Status == "completed" {
		params.CompletedAt = pgtype.Timestamptz{Time: time.Now(), Valid: true}
	}

	row, err := s.queries.UpdateDrawing(ctx, params)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, huma.Error404NotFound("그림을 찾을 수 없습니다.")
		}
		return nil, huma.Error500InternalServerError("drawing update failed", err)
	}

	return &DrawingOutput{Body: toDrawing(row)}, nil
}

// DeleteDrawing — DELETE /drawings/{id}
type DeleteDrawingInput struct {
	ID string `path:"id"`
}

func (s *Server) DeleteDrawing(ctx context.Context, input *DeleteDrawingInput) (*struct{}, error) {
	userID, err := userIDFromContext(ctx)
	if err != nil {
		return nil, huma.Error401Unauthorized("not authenticated")
	}

	if err := s.queries.SoftDeleteDrawing(ctx, db.SoftDeleteDrawingParams{
		ID:     input.ID,
		UserID: userID,
	}); err != nil {
		return nil, huma.Error500InternalServerError("drawing delete failed", err)
	}
	return nil, nil
}
