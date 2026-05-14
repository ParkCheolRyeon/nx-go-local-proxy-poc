package server

import (
	"context"
	"time"

	"github.com/danielgtaylor/huma/v2"
	"github.com/ParkCheolRyeon/igallery-db/db"
)

// Notification — 도메인 표현. category 는 'contest','social','coin','system'.
type Notification struct {
	ID          string    `json:"id"          example:"a3f2c891d4b7e0f1"`
	Category    string    `json:"category"    enum:"contest,social,coin,system"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Icon        string    `json:"icon,omitempty"`
	Cta         string    `json:"cta,omitempty"`
	ReadStatus  string    `json:"readStatus"  enum:"read,unRead"`
	CreatedAt   time.Time `json:"createdAt"`
}

func toNotification(n db.Notification) Notification {
	out := Notification{
		ID:          n.ID,
		Category:    n.Category,
		Title:       n.Title,
		Description: n.Description,
		ReadStatus:  n.ReadStatus,
		CreatedAt:   n.CreatedAt.Time,
	}
	if n.Icon != nil {
		out.Icon = *n.Icon
	}
	if n.Cta != nil {
		out.Cta = *n.Cta
	}
	return out
}

// ListNotifications — GET /notifications
type ListNotificationsInput struct {
	Category string `query:"category" enum:",contest,social,coin,system"`
	Limit    int32  `query:"limit"    minimum:"1" maximum:"100" default:"50"`
	Offset   int32  `query:"offset"   minimum:"0" default:"0"`
}

type ListNotificationsOutput struct {
	Body struct {
		Items       []Notification `json:"items"`
		UnreadCount int32          `json:"unreadCount"`
	}
}

func (s *Server) ListNotifications(ctx context.Context, input *ListNotificationsInput) (*ListNotificationsOutput, error) {
	userID, err := userIDFromContext(ctx)
	if err != nil {
		return nil, huma.Error401Unauthorized("not authenticated")
	}

	rows, err := s.queries.ListNotificationsByUser(ctx, db.ListNotificationsByUserParams{
		UserID:   userID,
		Category: nullableString(input.Category),
		Lim:      input.Limit,
		Off:      input.Offset,
	})
	if err != nil {
		return nil, huma.Error500InternalServerError("DB query failed", err)
	}

	unread, err := s.queries.GetUnreadNotificationCount(ctx, userID)
	if err != nil {
		return nil, huma.Error500InternalServerError("DB query failed", err)
	}

	items := make([]Notification, 0, len(rows))
	for _, r := range rows {
		items = append(items, toNotification(r))
	}

	out := &ListNotificationsOutput{}
	out.Body.Items = items
	out.Body.UnreadCount = unread
	return out, nil
}

// MarkNotificationRead — PATCH /notifications/{id}/read
type MarkNotificationReadInput struct {
	ID string `path:"id"`
}

func (s *Server) MarkNotificationRead(ctx context.Context, input *MarkNotificationReadInput) (*struct{}, error) {
	userID, err := userIDFromContext(ctx)
	if err != nil {
		return nil, huma.Error401Unauthorized("not authenticated")
	}

	if err := s.queries.MarkNotificationRead(ctx, db.MarkNotificationReadParams{
		ID:     input.ID,
		UserID: userID,
	}); err != nil {
		return nil, huma.Error500InternalServerError("notification update failed", err)
	}
	return nil, nil
}

// MarkAllNotificationsRead — PATCH /notifications/read-all
func (s *Server) MarkAllNotificationsRead(ctx context.Context, _ *struct{}) (*struct{}, error) {
	userID, err := userIDFromContext(ctx)
	if err != nil {
		return nil, huma.Error401Unauthorized("not authenticated")
	}
	if err := s.queries.MarkAllNotificationsRead(ctx, userID); err != nil {
		return nil, huma.Error500InternalServerError("notification update failed", err)
	}
	return nil, nil
}

// CreateNotification — POST /notifications  (dev seed; R12·R13 시스템 트리거로 대체 예정)
type CreateNotificationInput struct {
	Body struct {
		Category    string `json:"category"    enum:"contest,social,coin,system"`
		Title       string `json:"title"       minLength:"1" maxLength:"120"`
		Description string `json:"description" minLength:"1" maxLength:"500"`
		Icon        string `json:"icon,omitempty"`
		Cta         string `json:"cta,omitempty"`
	}
}

type NotificationOutput struct {
	Body Notification
}

func (s *Server) CreateNotification(ctx context.Context, input *CreateNotificationInput) (*NotificationOutput, error) {
	userID, err := userIDFromContext(ctx)
	if err != nil {
		return nil, huma.Error401Unauthorized("not authenticated")
	}

	row, err := s.queries.CreateNotification(ctx, db.CreateNotificationParams{
		ID:          generateID(),
		UserID:      userID,
		Category:    input.Body.Category,
		Title:       input.Body.Title,
		Description: input.Body.Description,
		Icon:        nullableString(input.Body.Icon),
		Cta:         nullableString(input.Body.Cta),
	})
	if err != nil {
		return nil, huma.Error500InternalServerError("notification insert failed", err)
	}
	return &NotificationOutput{Body: toNotification(row)}, nil
}

// =============================================================================
// Push tokens
// =============================================================================

// RegisterPushToken — POST /push-tokens
type RegisterPushTokenInput struct {
	Body struct {
		Platform string `json:"platform" enum:"ios,android,web"`
		Token    string `json:"token"    minLength:"1" maxLength:"500"`
	}
}

type RegisterPushTokenOutput struct {
	Body struct {
		ID       string `json:"id"`
		Platform string `json:"platform"`
		Token    string `json:"token"`
	}
}

func (s *Server) RegisterPushToken(ctx context.Context, input *RegisterPushTokenInput) (*RegisterPushTokenOutput, error) {
	userID, err := userIDFromContext(ctx)
	if err != nil {
		return nil, huma.Error401Unauthorized("not authenticated")
	}

	row, err := s.queries.UpsertPushToken(ctx, db.UpsertPushTokenParams{
		ID:       generateID(),
		UserID:   userID,
		Platform: input.Body.Platform,
		Token:    input.Body.Token,
	})
	if err != nil {
		return nil, huma.Error500InternalServerError("push token upsert failed", err)
	}

	out := &RegisterPushTokenOutput{}
	out.Body.ID = row.ID
	out.Body.Platform = row.Platform
	out.Body.Token = row.Token
	return out, nil
}

// UnregisterPushToken — DELETE /push-tokens
type UnregisterPushTokenInput struct {
	Body struct {
		Token string `json:"token" minLength:"1"`
	}
}

func (s *Server) UnregisterPushToken(ctx context.Context, input *UnregisterPushTokenInput) (*struct{}, error) {
	userID, err := userIDFromContext(ctx)
	if err != nil {
		return nil, huma.Error401Unauthorized("not authenticated")
	}
	if err := s.queries.DeletePushToken(ctx, db.DeletePushTokenParams{
		UserID: userID,
		Token:  input.Body.Token,
	}); err != nil {
		return nil, huma.Error500InternalServerError("push token delete failed", err)
	}
	return nil, nil
}
