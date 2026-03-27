package rpc

import (
	"context"
	"database/sql"
	"errors"
	"log/slog"

	connect "connectrpc.com/connect"
	"google.golang.org/protobuf/types/known/timestamppb"
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

func sqlNullableTime(t *timestamppb.Timestamp) sql.NullTime {
	if t == nil {
		return sql.NullTime{}
	}
	return sql.NullTime{Time: t.AsTime(), Valid: true}
}

func sqlNullString(s *string) sql.NullString {
	if s == nil {
		return sql.NullString{Valid: false}
	}
	return sql.NullString{String: *s, Valid: true}
}
