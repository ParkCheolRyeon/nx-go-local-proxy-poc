package server

import (
	"context"
	"time"

	"github.com/danielgtaylor/huma/v2"
	"github.com/ParkCheolRyeon/igallery-db/db"
)

// 도메인
type SupportInquiry struct {
	ID        string    `json:"id"`
	Subject   string    `json:"subject"`
	Message   string    `json:"message"`
	Status    string    `json:"status" enum:"open,in_progress,answered,closed"`
	CreatedAt time.Time `json:"createdAt"`
}

func toSupportInquiry(i db.SupportInquiry) SupportInquiry {
	return SupportInquiry{
		ID:        i.ID,
		Subject:   i.Subject,
		Message:   i.Message,
		Status:    i.Status,
		CreatedAt: i.CreatedAt.Time,
	}
}

type CreateSupportInquiryInput struct {
	Body struct {
		Subject string `json:"subject" minLength:"1" maxLength:"200" example:"결제가 두 번 처리됐어요"`
		Message string `json:"message" minLength:"1" maxLength:"5000"`
	}
}

type SupportInquiryOutput struct {
	Body SupportInquiry
}

// CreateSupportInquiry — POST /support-inquiries (Bearer)
func (s *Server) CreateSupportInquiry(ctx context.Context, input *CreateSupportInquiryInput) (*SupportInquiryOutput, error) {
	userID, err := userIDFromContext(ctx)
	if err != nil {
		return nil, huma.Error401Unauthorized("not authenticated")
	}

	row, err := s.queries.CreateSupportInquiry(ctx, db.CreateSupportInquiryParams{
		ID:      generateID(),
		UserID:  userID,
		Subject: input.Body.Subject,
		Message: input.Body.Message,
	})
	if err != nil {
		return nil, huma.Error500InternalServerError("inquiry create failed", err)
	}
	return &SupportInquiryOutput{Body: toSupportInquiry(row)}, nil
}
