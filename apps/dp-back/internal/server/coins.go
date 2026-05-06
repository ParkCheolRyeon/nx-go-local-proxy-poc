package server

import (
	"context"
	"errors"
	"time"

	"github.com/danielgtaylor/huma/v2"
	"github.com/iscreamarts/igallery/dp-back/internal/db"
	"github.com/jackc/pgx/v5"
)

// Wallet — 도메인 표현. spec: holdingCoins, monthlyCoinAllowance, dailyTopupRemainingDays.
type Wallet struct {
	HoldingCoins              int32     `json:"holdingCoins"              example:"3"`
	MonthlyCoinAllowance      int32     `json:"monthlyCoinAllowance"      example:"0"`
	DailyTopupRemainingDays   int32     `json:"dailyTopupRemainingDays"   example:"7"`
	UpdatedAt                 time.Time `json:"updatedAt"`
}

func toWallet(w db.CoinWallet) Wallet {
	return Wallet{
		HoldingCoins:            w.HoldingCoins,
		MonthlyCoinAllowance:    w.MonthlyCoinAllowance,
		DailyTopupRemainingDays: int32(w.DailyTopupRemainingDays),
		UpdatedAt:               w.UpdatedAt.Time,
	}
}

type WalletOutput struct {
	Body Wallet
}

// GetMyCoinWallet — GET /coins/wallet
func (s *Server) GetMyCoinWallet(ctx context.Context, _ *struct{}) (*WalletOutput, error) {
	userID, err := userIDFromContext(ctx)
	if err != nil {
		return nil, huma.Error401Unauthorized("not authenticated")
	}

	row, err := s.queries.GetCoinWallet(ctx, userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, huma.Error404NotFound("코인 지갑이 없습니다.")
		}
		return nil, huma.Error500InternalServerError("DB query failed", err)
	}

	return &WalletOutput{Body: toWallet(row)}, nil
}

// runDailyTopup — 매일 1회 호출.
//
//  1. 잔액 0 인 사용자에게 1개 충전 (remaining_days > 0 한정) — RETURNING user_id
//  2. 잔액 있는 사용자는 remaining_days 만 차감 (8일째 자동 종료 보장)
//  3. 충전된 사용자별로 coin_ledgers 에 daily_topup 기록
func (s *Server) runDailyTopup(ctx context.Context) (int, error) {
	toppedUpUsers, err := s.queries.ApplyDailyTopupToZeroBalance(ctx)
	if err != nil {
		return 0, err
	}

	if err := s.queries.DecrementTopupRemainingDays(ctx); err != nil {
		return 0, err
	}

	for _, userID := range toppedUpUsers {
		if err := s.queries.InsertCoinLedger(ctx, db.InsertCoinLedgerParams{
			ID:           generateID(),
			UserID:       userID,
			Delta:        1,
			Reason:       "daily_topup",
			BalanceAfter: 1,
			RefID:        nil,
		}); err != nil {
			// 한 명 실패해도 나머지 진행. 로그는 호출 측 책임.
			return len(toppedUpUsers), err
		}
	}

	return len(toppedUpUsers), nil
}
