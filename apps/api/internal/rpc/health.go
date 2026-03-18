package rpc

import (
	"context"
	"time"

	connect "connectrpc.com/connect"

	v1 "github.com/BBruington/party-planner/api/gen/planner/v1"
	"github.com/BBruington/party-planner/api/gen/planner/v1/plannerv1connect"
)

type HealthServer struct {
	plannerv1connect.UnimplementedHealthServiceHandler
}

func (s *HealthServer) Check(
	_ context.Context,
	_ *connect.Request[v1.CheckRequest],
) (*connect.Response[v1.CheckResponse], error) {
	return connect.NewResponse(&v1.CheckResponse{
		Status:    "ok",
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Version:   "0.0.0",
	}), nil
}
