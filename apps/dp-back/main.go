package main

import (
	"context"
	"log"
	"os"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	redisx "github.com/iscreamarts/igallery/apps/dp-back/internal/redis"
	"github.com/iscreamarts/igallery/apps/dp-back/internal/server"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("no .env file, falling back to system env")
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL not set")
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		log.Fatal("JWT_SECRET not set")
	}

	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		redisURL = "redis://localhost:6379"
		log.Printf("REDIS_URL not set, using default %s", redisURL)
	}

	ctx := context.Background()

	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		log.Fatalf("pgxpool.New: %v", err)
	}
	defer pool.Close()

	if err := pool.Ping(ctx); err != nil {
		log.Fatalf("pool.Ping: %v", err)
	}
	log.Println("✓ Postgres connected")

	redisClient, err := redisx.New(ctx, redisURL)
	if err != nil {
		log.Fatalf("redis.New: %v", err)
	}
	defer redisClient.Close()
	log.Println("✓ Redis connected")

	r := gin.Default()
	r.Use(cors.New(cors.Config{
		AllowOrigins: []string{
			"https://dp.dev.local",
			"http://localhost:3000",
			"https://dvwfpnuzutd8s.cloudfront.net",
		},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	srv := server.New(pool, redisClient, jwtSecret)
	api := server.NewAPI(r, srv)
	server.RegisterRoutes(api, srv)

	srv.StartDailyTopupCron(ctx)

	r.Run(":8080")
}
