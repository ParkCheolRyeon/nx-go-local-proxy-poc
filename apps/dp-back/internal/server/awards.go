package server

import (
	"context"
	"errors"
	"time"

	"github.com/danielgtaylor/huma/v2"
	"github.com/iscreamarts/igallery/dp-back/internal/db"
	"github.com/jackc/pgx/v5"
)

// AwardEntry — 수상 + 작품 정보 합본 (ListAwards 반환용).
type AwardEntry struct {
	AwardID     string     `json:"awardId"`
	Rank        string     `json:"rank"        enum:"grand,gold,silver,bronze,encourage"`
	EventID     string     `json:"eventId,omitempty"`
	AwardedAt   time.Time  `json:"awardedAt"`
	DrawingID   string     `json:"drawingId"`
	Mode        string     `json:"mode"`
	Title       string     `json:"title"`
	ThumbnailURL string    `json:"thumbnailUrl,omitempty"`
	ImageURL    string     `json:"imageUrl,omitempty"`
	TimelapseURL string    `json:"timelapseUrl,omitempty"`
	IsPublic    bool       `json:"isPublic"`
	CompletedAt *time.Time `json:"completedAt,omitempty"`
}

func toAwardEntry(r db.ListAwardsByChildRow) AwardEntry {
	out := AwardEntry{
		AwardID:   r.AwardID,
		Rank:      r.Rank,
		AwardedAt: r.AwardedAt.Time,
		DrawingID: r.DrawingID,
		Mode:      r.Mode,
		Title:     r.Title,
		IsPublic:  r.IsPublic,
	}
	if r.EventID != nil {
		out.EventID = *r.EventID
	}
	if r.ThumbnailUrl != nil {
		out.ThumbnailURL = *r.ThumbnailUrl
	}
	if r.ImageUrl != nil {
		out.ImageURL = *r.ImageUrl
	}
	if r.TimelapseUrl != nil {
		out.TimelapseURL = *r.TimelapseUrl
	}
	if r.CompletedAt.Valid {
		t := r.CompletedAt.Time
		out.CompletedAt = &t
	}
	return out
}

// ListAwards — GET /children/{id}/awards
type ListAwardsInput struct {
	ChildID string `path:"id"`
	Limit   int32  `query:"limit"  minimum:"1" maximum:"100" default:"50"`
	Offset  int32  `query:"offset" minimum:"0" default:"0"`
}

type ListAwardsOutput struct {
	Body struct {
		Items []AwardEntry `json:"items"`
	}
}

func (s *Server) ListAwards(ctx context.Context, input *ListAwardsInput) (*ListAwardsOutput, error) {
	userID, err := userIDFromContext(ctx)
	if err != nil {
		return nil, huma.Error401Unauthorized("not authenticated")
	}

	rows, err := s.queries.ListAwardsByChild(ctx, db.ListAwardsByChildParams{
		ChildProfileID: input.ChildID,
		UserID:         userID,
		Lim:            input.Limit,
		Off:            input.Offset,
	})
	if err != nil {
		return nil, huma.Error500InternalServerError("DB query failed", err)
	}

	items := make([]AwardEntry, 0, len(rows))
	for _, r := range rows {
		items = append(items, toAwardEntry(r))
	}

	out := &ListAwardsOutput{}
	out.Body.Items = items
	return out, nil
}

// CreateAward — POST /awards  (dev seed; R13 에서 모더레이션 승인 후 자동 호출로 대체)
type CreateAwardInput struct {
	Body struct {
		DrawingID string `json:"drawingId" minLength:"1"`
		EventID   string `json:"eventId,omitempty"`
		Rank      string `json:"rank"      enum:"grand,gold,silver,bronze,encourage"`
	}
}

type AwardOutput struct {
	Body struct {
		ID         string    `json:"id"`
		DrawingID  string    `json:"drawingId"`
		ChildID    string    `json:"childProfileId"`
		EventID    string    `json:"eventId,omitempty"`
		Rank       string    `json:"rank"`
		AwardedAt  time.Time `json:"awardedAt"`
	}
}

func (s *Server) CreateAward(ctx context.Context, input *CreateAwardInput) (*AwardOutput, error) {
	userID, err := userIDFromContext(ctx)
	if err != nil {
		return nil, huma.Error401Unauthorized("not authenticated")
	}

	// drawing 소유권 검증 + child_profile_id 추출
	drawing, err := s.queries.GetDrawing(ctx, db.GetDrawingParams{
		ID:     input.Body.DrawingID,
		UserID: userID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, huma.Error404NotFound("그림을 찾을 수 없습니다.")
		}
		return nil, huma.Error500InternalServerError("DB query failed", err)
	}

	row, err := s.queries.CreateAward(ctx, db.CreateAwardParams{
		ID:             generateID(),
		DrawingID:      input.Body.DrawingID,
		ChildProfileID: drawing.ChildProfileID,
		EventID:        nullableString(input.Body.EventID),
		Rank:           input.Body.Rank,
	})
	if err != nil {
		return nil, huma.Error500InternalServerError("award insert failed", err)
	}

	out := &AwardOutput{}
	out.Body.ID = row.ID
	out.Body.DrawingID = row.DrawingID
	out.Body.ChildID = row.ChildProfileID
	if row.EventID != nil {
		out.Body.EventID = *row.EventID
	}
	out.Body.Rank = row.Rank
	out.Body.AwardedAt = row.AwardedAt.Time
	return out, nil
}
