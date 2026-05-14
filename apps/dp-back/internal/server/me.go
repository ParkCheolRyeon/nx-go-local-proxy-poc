package server

import (
	"context"

	"github.com/danielgtaylor/huma/v2"
	"github.com/iscreamarts/igallery/packages/igallery-db/db"
)

func (s *Server) GetMe(ctx context.Context, _ *struct{}) (*UserOutput, error) {
	userID, err := userIDFromContext(ctx)
	if err != nil {
		return nil, huma.Error401Unauthorized("not authenticated")
	}

	dbUser, err := s.queries.GetUser(ctx, userID)
	if err != nil {
		return nil, huma.Error404NotFound("사용자를 찾을 수 없습니다.")
	}

	return &UserOutput{Body: toDomain(dbUser)}, nil
}

// PatchMe — 현재 로그인 사용자의 locale/country 부분 갱신.
// nil 필드는 기존 값 유지 (COALESCE).
type PatchMeInput struct {
	Body struct {
		Locale  *string `json:"locale,omitempty"  enum:"ko,en,ja"`
		Country *string `json:"country,omitempty" minLength:"2" maxLength:"2"`
	}
}

func (s *Server) PatchMe(ctx context.Context, input *PatchMeInput) (*UserOutput, error) {
	userID, err := userIDFromContext(ctx)
	if err != nil {
		return nil, huma.Error401Unauthorized("not authenticated")
	}

	if input.Body.Locale == nil && input.Body.Country == nil {
		dbUser, err := s.queries.GetUser(ctx, userID)
		if err != nil {
			return nil, huma.Error404NotFound("사용자를 찾을 수 없습니다.")
		}
		return &UserOutput{Body: toDomain(dbUser)}, nil
	}

	updated, err := s.queries.PatchUserLocaleCountry(ctx, db.PatchUserLocaleCountryParams{
		ID:      userID,
		Locale:  input.Body.Locale,
		Country: input.Body.Country,
	})
	if err != nil {
		return nil, huma.Error500InternalServerError("preferences update failed", err)
	}
	return &UserOutput{Body: toDomain(updated)}, nil
}
