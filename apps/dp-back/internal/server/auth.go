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

	// 가입 시 지급 코인 (스펙: 가입 즉시 +3)
	signupGrantCoins = 3
)

// SignUpInput — POST /auth/signup 의 요청 본문 정의
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

type AuthTokenBody struct {
	AccessToken      string    `json:"accessToken"`
	ExpiresAt        time.Time `json:"expiresAt"`
	RefreshToken     string    `json:"refreshToken"`
	RefreshExpiresAt time.Time `json:"refreshExpiresAt"`
	User             User      `json:"user"`
}

type SignInOutput struct {
	Body AuthTokenBody
}

// SignUp — 회원가입 핸들러
// 트랜잭션 안에서 users / coin_wallets / user_preferences / agreement_records / coin_ledgers (signup_grant) 5개 INSERT.
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

	transaction, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, huma.Error500InternalServerError("transaction begin failed", err)
	}
	defer transaction.Rollback(ctx)

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

	// 코인 지갑 생성 (default holding_coins=3, daily_topup_remaining_days=7)
	if _, err := queriesInTx.CreateCoinWallet(ctx, userID); err != nil {
		return nil, huma.Error500InternalServerError("wallet insert failed", err)
	}

	// 가입 코인 지급 원장 기록
	if err := queriesInTx.InsertCoinLedger(ctx, db.InsertCoinLedgerParams{
		ID:           generateID(),
		UserID:       userID,
		Delta:        signupGrantCoins,
		Reason:       "signup_grant",
		BalanceAfter: signupGrantCoins,
		RefID:        nil,
	}); err != nil {
		return nil, huma.Error500InternalServerError("ledger insert failed", err)
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
		return nil, huma.Error401Unauthorized("이메일 또는 비밀번호가 올바르지 않습니다.")
	}

	if dbUser.PasswordHash == nil {
		return nil, huma.Error401Unauthorized("이메일 또는 비밀번호가 올바르지 않습니다.")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(*dbUser.PasswordHash), []byte(input.Body.Password)); err != nil {
		return nil, huma.Error401Unauthorized("이메일 또는 비밀번호가 올바르지 않습니다.")
	}

	tokens, err := s.issueAuthTokens(ctx, dbUser.ID)
	if err != nil {
		return nil, huma.Error500InternalServerError("token issue failed", err)
	}

	if err := s.logTokenIssuance(ctx, dbUser.ID, "signin", tokens.accessJTI, tokens.refreshToken); err != nil {
		// 감사 로그 실패는 토큰 발급 자체를 막진 않음 (best-effort)
		_ = err
	}

	out := &SignInOutput{}
	out.Body = AuthTokenBody{
		AccessToken:      tokens.accessToken,
		ExpiresAt:        tokens.accessExpiresAt,
		RefreshToken:     tokens.refreshToken,
		RefreshExpiresAt: tokens.refreshExpiresAt,
		User:             toDomain(dbUser),
	}
	return out, nil
}

// RefreshInput — POST /auth/refresh
type RefreshInput struct {
	Body struct {
		RefreshToken string `json:"refreshToken" minLength:"1"`
	}
}

type RefreshOutput struct {
	Body struct {
		AccessToken      string    `json:"accessToken"`
		ExpiresAt        time.Time `json:"expiresAt"`
		RefreshToken     string    `json:"refreshToken"`
		RefreshExpiresAt time.Time `json:"refreshExpiresAt"`
	}
}

// Refresh — refresh 토큰을 회전하면서 새 access + 새 refresh 발급.
func (s *Server) Refresh(ctx context.Context, input *RefreshInput) (*RefreshOutput, error) {
	userID, err := s.consumeRefreshToken(ctx, input.Body.RefreshToken)
	if errors.Is(err, ErrRefreshNotFound) {
		return nil, huma.Error401Unauthorized("유효하지 않은 refresh 토큰입니다.")
	}
	if err != nil {
		return nil, huma.Error500InternalServerError("refresh failed", err)
	}

	tokens, err := s.issueAuthTokens(ctx, userID)
	if err != nil {
		return nil, huma.Error500InternalServerError("token issue failed", err)
	}

	if err := s.logTokenIssuance(ctx, userID, "refresh", tokens.accessJTI, tokens.refreshToken); err != nil {
		_ = err
	}

	out := &RefreshOutput{}
	out.Body.AccessToken = tokens.accessToken
	out.Body.ExpiresAt = tokens.accessExpiresAt
	out.Body.RefreshToken = tokens.refreshToken
	out.Body.RefreshExpiresAt = tokens.refreshExpiresAt
	return out, nil
}

// ChangePasswordInput — POST /auth/password (Bearer 필수)
type ChangePasswordInput struct {
	Body struct {
		CurrentPassword string `json:"currentPassword" minLength:"1"  maxLength:"200"`
		NewPassword     string `json:"newPassword"     minLength:"8"  maxLength:"200"`
	}
}

// ChangePassword — 현재 비번 검증 + 새 비번 hash 저장 + 모든 refresh 세션 폐기 + 현재 jti 블랙리스트.
// 성공 시 클라이언트는 모든 토큰이 무효화되므로 즉시 재로그인 시켜야 함.
func (s *Server) ChangePassword(ctx context.Context, input *ChangePasswordInput) (*struct{}, error) {
	userID, err := userIDFromContext(ctx)
	if err != nil {
		return nil, huma.Error401Unauthorized("not authenticated")
	}

	if input.Body.NewPassword == input.Body.CurrentPassword {
		return nil, huma.Error400BadRequest("새 비밀번호가 현재 비밀번호와 같아요.")
	}

	dbUser, err := s.queries.GetUser(ctx, userID)
	if err != nil {
		return nil, huma.Error404NotFound("사용자를 찾을 수 없어요.")
	}
	if dbUser.PasswordHash == nil {
		return nil, huma.Error400BadRequest("이 계정은 비밀번호로 로그인하지 않아요.")
	}

	if err := bcrypt.CompareHashAndPassword(
		[]byte(*dbUser.PasswordHash),
		[]byte(input.Body.CurrentPassword),
	); err != nil {
		return nil, huma.Error401Unauthorized("현재 비밀번호가 일치하지 않아요.")
	}

	newHash, err := bcrypt.GenerateFromPassword([]byte(input.Body.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return nil, huma.Error500InternalServerError("hash failed", err)
	}

	if err := s.queries.UpdatePasswordHash(ctx, db.UpdatePasswordHashParams{
		ID:           userID,
		PasswordHash: ptrString(string(newHash)),
	}); err != nil {
		return nil, huma.Error500InternalServerError("password update failed", err)
	}

	// 모든 refresh 세션 폐기 (best-effort — 실패해도 비번은 이미 바뀜).
	if err := s.revokeAllUserSessions(ctx, userID); err != nil {
		_ = err
	}

	// 현재 access 의 jti 블랙리스트 (역시 best-effort).
	if jti, ok := jtiFromContext(ctx); ok {
		if exp, eok := accessExpFromContext(ctx); eok {
			_ = s.blacklistAccess(ctx, jti, time.Until(exp))
		}
	}

	return nil, nil
}

func ptrString(s string) *string { return &s }

// LogoutInput — POST /auth/logout (Bearer 필수)
type LogoutInput struct {
	Body struct {
		RefreshToken string `json:"refreshToken,omitempty"`
	}
}

// Logout — 현재 access 의 jti 블랙리스트 + (제공된) refresh 토큰 폐기.
func (s *Server) Logout(ctx context.Context, input *LogoutInput) (*struct{}, error) {
	userID, err := userIDFromContext(ctx)
	if err != nil {
		return nil, huma.Error401Unauthorized("not authenticated")
	}

	jti, ok := jtiFromContext(ctx)
	if ok {
		exp, _ := accessExpFromContext(ctx)
		remaining := time.Until(exp)
		if err := s.blacklistAccess(ctx, jti, remaining); err != nil {
			return nil, huma.Error500InternalServerError("blacklist failed", err)
		}
	}

	if input.Body.RefreshToken != "" {
		if err := s.revokeRefreshToken(ctx, input.Body.RefreshToken); err != nil {
			return nil, huma.Error500InternalServerError("revoke refresh failed", err)
		}
	}

	if err := s.logTokenIssuance(ctx, userID, "logout", jti, input.Body.RefreshToken); err != nil {
		_ = err
	}

	return nil, nil
}

// issuedTokens — 한 번에 발급되는 access + refresh 묶음.
type issuedTokens struct {
	accessToken      string
	accessJTI        string
	accessExpiresAt  time.Time
	refreshToken     string
	refreshExpiresAt time.Time
}

// issueAuthTokens — access(JWT) + refresh(opaque) 동시 발급. refresh 는 Redis 에 저장.
func (s *Server) issueAuthTokens(ctx context.Context, userID string) (issuedTokens, error) {
	jti := generateJTI()
	accessExpiresAt := time.Now().Add(accessTokenTTL)

	claims := jwt.MapClaims{
		"sub": userID,
		"jti": jti,
		"iat": time.Now().Unix(),
		"exp": accessExpiresAt.Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString(s.jwtSecret)
	if err != nil {
		return issuedTokens{}, err
	}

	refreshToken := generateOpaqueToken()
	refreshExpiresAt := time.Now().Add(refreshTokenTTL)
	if err := s.storeRefreshToken(ctx, refreshToken, userID); err != nil {
		return issuedTokens{}, err
	}

	return issuedTokens{
		accessToken:      signed,
		accessJTI:        jti,
		accessExpiresAt:  accessExpiresAt,
		refreshToken:     refreshToken,
		refreshExpiresAt: refreshExpiresAt,
	}, nil
}

// parsedAccess — middleware 에서 ctx 로 전달할 정보.
type parsedAccess struct {
	userID string
	jti    string
	exp    time.Time
}

// parseAccessToken - 토큰 문자열을 검증하고 sub/jti/exp 를 반환.
func (s *Server) parseAccessToken(tokenString string) (parsedAccess, error) {
	token, err := jwt.Parse(tokenString, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return s.jwtSecret, nil
	})

	if err != nil {
		return parsedAccess{}, err
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || !token.Valid {
		return parsedAccess{}, errors.New("invalid token")
	}

	sub, _ := claims["sub"].(string)
	jti, _ := claims["jti"].(string)
	if sub == "" {
		return parsedAccess{}, errors.New("missing sub claim")
	}

	var exp time.Time
	if e, ok := claims["exp"].(float64); ok {
		exp = time.Unix(int64(e), 0)
	}

	return parsedAccess{userID: sub, jti: jti, exp: exp}, nil
}

// context에 값을 저장할때 다른 패키지의 키와 충돌하지 않도록 별도 타입 정의
type contextKey string

const (
	userIDContextKey contextKey = "userID"
	jtiContextKey    contextKey = "accessJTI"
	expContextKey    contextKey = "accessExp"
)

// AuthMiddleware - Authorization: Bearer <token> 헤더를 검증하고 userID/jti/exp 를 ctx 에 주입.
// jti 는 Redis 블랙리스트와 대조하여 즉시 무효화 가능.
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
		parsed, err := s.parseAccessToken(tokenString)
		if err != nil {
			huma.WriteErr(api, huCtx, 401, "유효하지 않은 토큰입니다.")
			return
		}

		if parsed.jti != "" {
			blacklisted, err := s.isAccessBlacklisted(huCtx.Context(), parsed.jti)
			if err != nil {
				huma.WriteErr(api, huCtx, 500, "토큰 검증 실패")
				return
			}
			if blacklisted {
				huma.WriteErr(api, huCtx, 401, "폐기된 토큰입니다.")
				return
			}
		}

		huCtx = huma.WithValue(huCtx, userIDContextKey, parsed.userID)
		huCtx = huma.WithValue(huCtx, jtiContextKey, parsed.jti)
		huCtx = huma.WithValue(huCtx, expContextKey, parsed.exp)
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

func jtiFromContext(ctx context.Context) (string, bool) {
	jti, ok := ctx.Value(jtiContextKey).(string)
	return jti, ok && jti != ""
}

func accessExpFromContext(ctx context.Context) (time.Time, bool) {
	exp, ok := ctx.Value(expContextKey).(time.Time)
	return exp, ok
}

// logTokenIssuance — token_issuance_log 테이블에 감사 로그 INSERT (best-effort).
// IP/UA 추출은 huma context 에서 직접 못 가져오므로 비워둠. middleware 에서 주입하려면 추후 확장.
func (s *Server) logTokenIssuance(ctx context.Context, userID, event, accessJTI, refreshToken string) error {
	var jtiPtr *string
	if accessJTI != "" {
		jtiPtr = &accessJTI
	}
	var refreshPtr *string
	if refreshToken != "" {
		// refresh 토큰 자체가 아닌 식별자(앞 16자) 로 기록 — 원문 보관 X
		shortened := refreshToken
		if len(shortened) > 16 {
			shortened = shortened[:16]
		}
		refreshPtr = &shortened
	}
	return s.queries.InsertTokenIssuanceLog(ctx, db.InsertTokenIssuanceLogParams{
		ID:         generateID(),
		UserID:     userID,
		Event:      event,
		AccessJti:  jtiPtr,
		RefreshID:  refreshPtr,
		UserAgent:  nil,
		IpAddress:  nil,
	})
}
