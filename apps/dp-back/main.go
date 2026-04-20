package main

import (
	"github.com/gin-gonic/gin"
	"github.com/iscreamarts/igallery/dp-back/internal/api"
)

type Server struct {
}

func (s *Server) GetHealth(ctx *gin.Context) {
	ctx.JSON(200, api.HealthResponse{
		Status: api.Ok,
	})
}

func main() {
	r := gin.Default()
	api.RegisterHandlers(r, &Server{})

	r.Run(":8080")
}
