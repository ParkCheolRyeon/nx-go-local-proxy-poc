package server

import (
	"context"
	"log"
	"time"
)

// StartDailyTopupCron — UTC 기준 매일 자정에 코인 일일 충전 실행.
// goroutine 으로 띄우고 ctx Done 시 종료. 여러 인스턴스가 동시에 돌면 중복 충전 위험 있어
// 프로덕션에서는 분산 락(Redis SETNX 등) 또는 외부 스케줄러로 교체 필요.
func (s *Server) StartDailyTopupCron(ctx context.Context) {
	go func() {
		for {
			next := nextUTCMidnight(time.Now().UTC())
			wait := time.Until(next)
			log.Printf("daily-topup: next run at %s (in %s)", next.Format(time.RFC3339), wait)

			select {
			case <-ctx.Done():
				return
			case <-time.After(wait):
			}

			toppedUp, err := s.runDailyTopup(ctx)
			if err != nil {
				log.Printf("daily-topup: %v", err)
				continue
			}
			log.Printf("daily-topup: topped up %d wallets", toppedUp)
		}
	}()
}

func nextUTCMidnight(now time.Time) time.Time {
	t := now.UTC()
	return time.Date(t.Year(), t.Month(), t.Day()+1, 0, 0, 0, 0, time.UTC)
}
