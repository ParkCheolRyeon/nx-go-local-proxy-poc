package server

import (
	"context"

	"github.com/danielgtaylor/huma/v2"
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
