package server

import (
	"context"
	"errors"

	"github.com/danielgtaylor/huma/v2"
	"github.com/jackc/pgx/v5"
	"github.com/iscreamarts/igallery/packages/igallery-db/db"
)

// 도메인
type Preferences struct {
	NotifDrawing   bool   `json:"notifDrawing"`
	NotifEvent     bool   `json:"notifEvent"`
	NotifSystem    bool   `json:"notifSystem"`
	NotifMarketing bool   `json:"notifMarketing"`
	DndEnabled     bool   `json:"dndEnabled"`
	DndStart       string `json:"dndStart" example:"22:00"`
	DndEnd         string `json:"dndEnd"   example:"08:00"`
	SafeMode       bool   `json:"safeMode"`
	PaymentLock    bool   `json:"paymentLock"`
	TogetherChat   bool   `json:"togetherChat"`
}

func toPreferences(p db.UserPreference) Preferences {
	return Preferences{
		NotifDrawing:   p.NotifDrawing,
		NotifEvent:     p.NotifEvent,
		NotifSystem:    p.NotifSystem,
		NotifMarketing: p.NotifMarketing,
		DndEnabled:     p.DndEnabled,
		DndStart:       p.DndStart,
		DndEnd:         p.DndEnd,
		SafeMode:       p.SafeMode,
		PaymentLock:    p.PaymentLock,
		TogetherChat:   p.TogetherChat,
	}
}

type PreferencesOutput struct {
	Body Preferences
}

// GET /me/preferences — 없으면 default row INSERT 후 반환 (R3a 이전 가입자 대비).
func (s *Server) GetMyPreferences(ctx context.Context, _ *struct{}) (*PreferencesOutput, error) {
	userID, err := userIDFromContext(ctx)
	if err != nil {
		return nil, huma.Error401Unauthorized("not authenticated")
	}

	pref, err := s.queries.GetUserPreferences(ctx, userID)
	if errors.Is(err, pgx.ErrNoRows) {
		pref, err = s.queries.CreateUserPreferences(ctx, userID)
		if err != nil {
			return nil, huma.Error500InternalServerError("preferences create failed", err)
		}
	} else if err != nil {
		return nil, huma.Error500InternalServerError("preferences fetch failed", err)
	}
	return &PreferencesOutput{Body: toPreferences(pref)}, nil
}

// PATCH /me/preferences — nil 필드는 기존 값 유지 (COALESCE).
type PatchMyPreferencesInput struct {
	Body struct {
		NotifDrawing   *bool   `json:"notifDrawing,omitempty"`
		NotifEvent     *bool   `json:"notifEvent,omitempty"`
		NotifSystem    *bool   `json:"notifSystem,omitempty"`
		NotifMarketing *bool   `json:"notifMarketing,omitempty"`
		DndEnabled     *bool   `json:"dndEnabled,omitempty"`
		DndStart       *string `json:"dndStart,omitempty"  pattern:"^[0-2][0-9]:[0-5][0-9]$"`
		DndEnd         *string `json:"dndEnd,omitempty"    pattern:"^[0-2][0-9]:[0-5][0-9]$"`
		SafeMode       *bool   `json:"safeMode,omitempty"`
		PaymentLock    *bool   `json:"paymentLock,omitempty"`
		TogetherChat   *bool   `json:"togetherChat,omitempty"`
	}
}

func (s *Server) PatchMyPreferences(ctx context.Context, input *PatchMyPreferencesInput) (*PreferencesOutput, error) {
	userID, err := userIDFromContext(ctx)
	if err != nil {
		return nil, huma.Error401Unauthorized("not authenticated")
	}

	// 행 없으면 먼저 생성 (R3a 이전 가입자 대비).
	if _, err := s.queries.GetUserPreferences(ctx, userID); errors.Is(err, pgx.ErrNoRows) {
		if _, cerr := s.queries.CreateUserPreferences(ctx, userID); cerr != nil {
			return nil, huma.Error500InternalServerError("preferences create failed", cerr)
		}
	} else if err != nil {
		return nil, huma.Error500InternalServerError("preferences fetch failed", err)
	}

	updated, err := s.queries.PatchUserPreferences(ctx, db.PatchUserPreferencesParams{
		UserID:         userID,
		NotifDrawing:   input.Body.NotifDrawing,
		NotifEvent:     input.Body.NotifEvent,
		NotifSystem:    input.Body.NotifSystem,
		NotifMarketing: input.Body.NotifMarketing,
		DndEnabled:     input.Body.DndEnabled,
		DndStart:       input.Body.DndStart,
		DndEnd:         input.Body.DndEnd,
		SafeMode:       input.Body.SafeMode,
		PaymentLock:    input.Body.PaymentLock,
		TogetherChat:   input.Body.TogetherChat,
	})
	if err != nil {
		return nil, huma.Error500InternalServerError("preferences update failed", err)
	}
	return &PreferencesOutput{Body: toPreferences(updated)}, nil
}
