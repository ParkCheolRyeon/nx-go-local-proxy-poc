package server

import (
	"context"
	"errors"
	"net/mail"
	"strings"
	"time"

	"github.com/danielgtaylor/huma/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/iscreamarts/igallery/dp-back/internal/db"
	"github.com/jackc/pgx/v5/pgconn"
	"golang.org/x/crypto/bcrypt"
)

const (
	// PostgreSQL이 unique 제약을 위반했을 때 돌려주는 표준 에러 코드
	pgUniqueViolation = "23505"

	// 약관 버전. 약관이 개정되면 이 상수만 올리고 재동의 받음.
	currentTermsVersion = "v1.0"
)

// SignUpInput — POST /auth/signup 의 요청 본문 정의
// huma 가 OpenAPI 스키마로 변환하면서 검증까지 자동으로 해 줌.
type SignUpInput struct {
	Body struct {
		Email             string `json:"email"             format:"email" maxLength:"254" example:"parkcr@example.com"`
		Password          string `json:"password"          minLength:"8"  maxLength:"72"  example:"strongPass1!"`
		Name              string `json:"name"              minLength:"1"  maxLength:"50"  example:"련철박"`
		PrivacyAccepted   bool   `json:"privacyAccepted"   example:"true"`
		MarketingAccepted bool   `json:"marketingAccepted" example:"false"`
	}
}

type SignInInput struct {
	Body struct {
		Email    string `json:"email" format:"email" example:"parkcr@example.com"`
		Password string `json:"password" minLength:"1" example:"stringPass1!"`
	}
}

type SignInOutput struct {
	Body struct {
		AccessToken string    `json:"accessToken"`
		ExpiresAt   time.Time `json:"expiresAt"`
		User        User      `json:"user"`
	}
}

// SignUp — 회원가입 핸들러
// 1) 입력 검증
// 2) 비밀번호 bcrypt 해시
// 3) 트랜잭션 시작
// 4) users / coin_wallets / user_preferences / agreement_records 4개 INSERT
// 5) 모두 성공하면 Commit, 하나라도 실패하면 Rollback
func (s *Server) SignUp(ctx context.Context, input *SignUpInput) (*UserOutput, error) {
	if !input.Body.PrivacyAccepted {
		return nil, huma.Error400BadRequest("개인정보 처리방침에 동의해야 가입할 수 있습니다.")
	}

	email := strings.TrimSpace(strings.ToLower(input.Body.Email))
	if _, err := mail.ParseAddress(email); err != nil {
		return nil, huma.Error400BadRequest("올바른 이메일 형식이 아닙니다.")
	}

	passwordHashBytes, err := bcrypt.GenerateFromPassword(
		[]byte(input.Body.Password),
		bcrypt.DefaultCost,
	)
	if err != nil {
		return nil, huma.Error500InternalServerError("password hash failed", err)
	}
	passwordHash := string(passwordHashBytes)

	// 트랜잭션 시작 — 4개 테이블 INSERT 를 하나의 작업 단위로 묶음
	transaction, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, huma.Error500InternalServerError("transaction begin failed", err)
	}
	// 함수가 어떤 경로로 종료되든 Rollback 호출. Commit 후의 Rollback 은 no-op.
	defer transaction.Rollback(ctx)

	// sqlc 가 만든 쿼리 메서드들을 트랜잭션 위에서 동작시키는 객체
	queriesInTx := s.queries.WithTx(transaction)

	userID := generateID()

	dbUser, err := queriesInTx.CreateUser(ctx, db.CreateUserParams{
		ID:           userID,
		Email:        &email,
		PasswordHash: &passwordHash,
		Name:         strings.TrimSpace(input.Body.Name),
	})
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == pgUniqueViolation {
			return nil, huma.Error409Conflict("이미 가입된 이메일입니다.")
		}
		return nil, huma.Error500InternalServerError("user insert failed", err)
	}

	if _, err := queriesInTx.CreateCoinWallet(ctx, userID); err != nil {
		return nil, huma.Error500InternalServerError("wallet insert failed", err)
	}

	if _, err := queriesInTx.CreateUserPreferences(ctx, userID); err != nil {
		return nil, huma.Error500InternalServerError("preferences insert failed", err)
	}

	if _, err := queriesInTx.CreateAgreementRecord(ctx, db.CreateAgreementRecordParams{
		ID:                generateID(),
		UserID:            userID,
		TermsVersion:      currentTermsVersion,
		PrivacyAccepted:   input.Body.PrivacyAccepted,
		MarketingAccepted: input.Body.MarketingAccepted,
	}); err != nil {
		return nil, huma.Error500InternalServerError("agreement insert failed", err)
	}

	if err := transaction.Commit(ctx); err != nil {
		return nil, huma.Error500InternalServerError("transaction commit failed", err)
	}

	return &UserOutput{Body: toDomain(dbUser)}, nil
}

func (s *Server) SignIn(ctx context.Context, input *SignInInput) (*SignInOutput, error) {
	email := strings.TrimSpace(strings.ToLower(input.Body.Email))

	dbUser, err := s.queries.GetUserByEmail(ctx, email)
	if err != nil {
		// 이메일 존재 여부를 노출하지 않기 위해 동일한 메시지 사용
		return nil, huma.Error401Unauthorized("이메일 또는 비밀번호가 올바르지 않습니다.")
	}

	if dbUser.PasswordHash == nil {
		// 소셜 가입 사용자 - 비번 로그인 불가능
		return nil, huma.Error401Unauthorized("이메일 또는 비밀번호가 올바르지 않습니다.")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(*dbUser.PasswordHash), []byte(input.Body.Password)); err != nil {
		return nil, huma.Error401Unauthorized("이메일 또는 비밀번호가 올바르지 않습니다.")
	}

	accessToken, expiresAt, err := s.issueAccessToken(dbUser.ID)
	if err != nil {
		return nil, huma.Error500InternalServerError("token issue failed", err)
	}

	out := &SignInOutput{}
	out.Body.AccessToken = accessToken
	out.Body.ExpiresAt = expiresAt
	out.Body.User = toDomain(dbUser)

	return out, nil
}

// issueAccessToken - 사용자 ID를 담은 JWT를 생성 후 문자열 return
func (s *Server) issueAccessToken(userID string) (string, time.Time, error) {
	expiresAt := time.Now().Add(accessTokenTTL)

	claims := jwt.MapClaims{
		"sub": userID,
		"iat": time.Now().Unix(),
		"exp": expiresAt.Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString(s.jwtSecret)
	if err != nil {
		return "", time.Time{}, err
	}

	return signed, expiresAt, nil
}

// parseAccessToken - 토큰 문자열을 검증하고 sub(userID)를 꺼냄
func (s *Server) parseAccessToken(tokenString string) (string, error) {
	token, err := jwt.Parse(tokenString, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return s.jwtSecret, nil
	})

	if err != nil {
		return "", err
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || !token.Valid {
		return "", errors.New("invalid token")
	}

	sub, ok := claims["sub"].(string)
	if !ok || sub == "" {
		return "", errors.New("missing sub claims")
	}
	return sub, nil
}

const accessTokenTTL = 24 * time.Hour

// context에 값을 저장할때 다른 패키지의 키와 충돌하지 않도록 별도 타입 정의
type contextKey string

const userIDContextKey contextKey = "userID"

// AuthMiddleware - Authorization: Bearer <token> 헤더를 검증하고
// 통과 시 userID를 ctx에 주입, Operation.Security가 비어있으면 걍 통과
func (s *Server) AuthMiddleware(api huma.API) func(huma.Context, func(huma.Context)) {
	return func(huCtx huma.Context, next func(huma.Context)) {
		needsAuth := false
		for _, scheme := range huCtx.Operation().Security {
			if _, ok := scheme["bearer"]; ok {
				needsAuth = true
				break
			}
		}
		if !needsAuth {
			next(huCtx)
			return
		}

		authHeader := huCtx.Header("Authorization")
		if !strings.HasPrefix(authHeader, "Bearer ") {
			huma.WriteErr(api, huCtx, 401, "Authorization 헤더가 필요합니다.")
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		userID, err := s.parseAccessToken(tokenString)
		if err != nil {
			huma.WriteErr(api, huCtx, 401, "유효하지 않은 토큰입니다.")
			return
		}

		huCtx = huma.WithValue(huCtx, userIDContextKey, userID)
		next(huCtx)
	}
}

func userIDFromContext(ctx context.Context) (string, error) {
	userID, ok := ctx.Value(userIDContextKey).(string)
	if !ok || userID == "" {
		return "", errors.New("userID not found in context")
	}
	return userID, nil
}
