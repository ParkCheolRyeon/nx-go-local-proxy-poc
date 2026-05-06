package server

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// 토큰 정책
//
// access  : JWT(HS256) · TTL 1h · jti 클레임 보유 · 블랙리스트 키와 매칭
// refresh : opaque random 32 bytes hex (64자) · TTL 30d · Redis 단독 저장
//
// Redis 키 구조
//   refresh:{token}              -> userID  (TTL 30d)
//   sessions:{userID}            -> SET of refresh tokens (감사·일괄 폐기용)
//   blacklist:{jti}              -> "1"     (TTL = access 잔여 만료까지)

const (
	accessTokenTTL  = 1 * time.Hour
	refreshTokenTTL = 30 * 24 * time.Hour

	redisKeyRefreshPrefix   = "refresh:"
	redisKeySessionsPrefix  = "sessions:"
	redisKeyBlacklistPrefix = "blacklist:"
)

// generateOpaqueToken — refresh token / jti 등 불투명 식별자 생성용.
// 32 bytes hex = 64 chars. 충돌 확률 무시 가능.
func generateOpaqueToken() string {
	b := make([]byte, 32)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

// generateJTI — JWT jti 클레임용. 16 bytes hex = 32 chars.
func generateJTI() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

// storeRefreshToken — refresh 토큰을 Redis 에 저장 + 사용자 세션 SET 에 등록.
func (s *Server) storeRefreshToken(ctx context.Context, token, userID string) error {
	pipe := s.redis.TxPipeline()
	pipe.Set(ctx, redisKeyRefreshPrefix+token, userID, refreshTokenTTL)
	pipe.SAdd(ctx, redisKeySessionsPrefix+userID, token)
	// sessions 셋은 영구 보존(가입 후에도 활성 토큰만 채워짐). 별도 TTL 안 검.
	if _, err := pipe.Exec(ctx); err != nil {
		return fmt.Errorf("store refresh: %w", err)
	}
	return nil
}

// consumeRefreshToken — 회전(rotation): 검증 후 즉시 삭제. 반환된 userID 로 새 토큰 발급.
// 존재하지 않거나 만료된 토큰이면 ErrRefreshNotFound.
var ErrRefreshNotFound = errors.New("refresh token not found or expired")

func (s *Server) consumeRefreshToken(ctx context.Context, token string) (string, error) {
	key := redisKeyRefreshPrefix + token
	userID, err := s.redis.Get(ctx, key).Result()
	if errors.Is(err, redis.Nil) {
		return "", ErrRefreshNotFound
	}
	if err != nil {
		return "", fmt.Errorf("get refresh: %w", err)
	}

	pipe := s.redis.TxPipeline()
	pipe.Del(ctx, key)
	pipe.SRem(ctx, redisKeySessionsPrefix+userID, token)
	if _, err := pipe.Exec(ctx); err != nil {
		return "", fmt.Errorf("rotate refresh: %w", err)
	}
	return userID, nil
}

// revokeRefreshToken — 명시적 폐기 (로그아웃). 토큰이 없어도 에러 아님.
func (s *Server) revokeRefreshToken(ctx context.Context, token string) error {
	key := redisKeyRefreshPrefix + token
	userID, err := s.redis.Get(ctx, key).Result()
	if errors.Is(err, redis.Nil) {
		return nil
	}
	if err != nil {
		return fmt.Errorf("get refresh: %w", err)
	}

	pipe := s.redis.TxPipeline()
	pipe.Del(ctx, key)
	pipe.SRem(ctx, redisKeySessionsPrefix+userID, token)
	if _, err := pipe.Exec(ctx); err != nil {
		return fmt.Errorf("revoke refresh: %w", err)
	}
	return nil
}

// revokeAllUserSessions — 사용자의 모든 refresh 토큰을 일괄 폐기.
// 비밀번호 변경 / 강제 로그아웃 등에 사용. 활성 access 의 jti 블랙리스트는 호출자가 별도 처리.
func (s *Server) revokeAllUserSessions(ctx context.Context, userID string) error {
	key := redisKeySessionsPrefix + userID
	tokens, err := s.redis.SMembers(ctx, key).Result()
	if err != nil {
		return fmt.Errorf("list sessions: %w", err)
	}
	if len(tokens) == 0 {
		return nil
	}
	pipe := s.redis.TxPipeline()
	for _, t := range tokens {
		pipe.Del(ctx, redisKeyRefreshPrefix+t)
	}
	pipe.Del(ctx, key)
	if _, err := pipe.Exec(ctx); err != nil {
		return fmt.Errorf("revoke all sessions: %w", err)
	}
	return nil
}

// blacklistAccess — access 토큰의 jti 를 즉시 무효화. TTL 은 access 잔여 만료 시간.
// remaining 이 0 이하면 이미 만료된 것이라 등록할 필요 없음.
func (s *Server) blacklistAccess(ctx context.Context, jti string, remaining time.Duration) error {
	if remaining <= 0 {
		return nil
	}
	if err := s.redis.Set(ctx, redisKeyBlacklistPrefix+jti, "1", remaining).Err(); err != nil {
		return fmt.Errorf("blacklist access: %w", err)
	}
	return nil
}

// isAccessBlacklisted — middleware 에서 토큰 검증 시 호출.
func (s *Server) isAccessBlacklisted(ctx context.Context, jti string) (bool, error) {
	res, err := s.redis.Exists(ctx, redisKeyBlacklistPrefix+jti).Result()
	if err != nil {
		return false, fmt.Errorf("check blacklist: %w", err)
	}
	return res > 0, nil
}
