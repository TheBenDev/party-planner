package rpc

import (
	"context"
	"errors"
	"log/slog"

	connect "connectrpc.com/connect"
)

func errMsg(msg string) error {
	return errors.New(msg)
}

const errorAttrSlots = 2 // slots for "error", cause key-value pair.

func internalErr(ctx context.Context, log *slog.Logger, clientMsg string, cause error, attrs ...any) error {
	args := make([]any, 0, len(attrs)+errorAttrSlots)
	args = append(args, "error", cause)
	args = append(args, attrs...)
	log.ErrorContext(ctx, clientMsg, args...)
	return connect.NewError(connect.CodeInternal, errMsg(clientMsg))
}
