package webhook

import (
	"database/sql"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"

	"github.com/clerk/clerk-sdk-go/v2"
	svix "github.com/svix/svix-webhooks/go"

	model "github.com/BBruington/party-planner/api/internal/models"
	"github.com/BBruington/party-planner/api/internal/service"
)

type ClerkWebhookHandler struct {
	User   *service.UserService
	Secret string
}

type clerkEvent struct {
	Type string          `json:"type"`
	Data json.RawMessage `json:"data"`
}

type clerkUserData struct {
	ID             string              `json:"id"`
	EmailAddresses []clerkEmailAddress `json:"email_addresses"`
	ImageURL       string              `json:"image_url"`
	FirstName      *string             `json:"first_name"`
	LastName       *string             `json:"last_name"`
}

type clerkEmailAddress struct {
	EmailAddress string `json:"email_address"`
}

const maxBodySize = int64(1 << 20) // 1 MiB

func (h *ClerkWebhookHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, maxBodySize)
	body, err := io.ReadAll(r.Body)
	if err != nil {
		slog.Error("clerk webhook: failed to read body", "error", err)
		http.Error(w, "request body too large", http.StatusRequestEntityTooLarge)
		return
	}

	wh, err := svix.NewWebhook(h.Secret)
	if err != nil {
		slog.Error("clerk webhook: failed to initialize verifier", "error", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	if err := wh.Verify(body, r.Header); err != nil {
		slog.Warn("clerk webhook: signature verification failed", "error", err)
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var event clerkEvent
	if err := json.Unmarshal(body, &event); err != nil {
		slog.Error("clerk webhook: failed to parse event", "error", err)
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}

	slog.Info("clerk webhook received", "type", event.Type)

	switch event.Type {
	case "user.created":
		h.handleUserCreated(w, r, event.Data)
	case "user.updated":
		h.handleUserUpdated(w, event.Data)
	case "user.deleted":
		h.handleUserDeleted(w, event.Data)
	default:
		slog.Info("clerk webhook: unhandled event type", "type", event.Type)
		w.WriteHeader(http.StatusNoContent)
	}
}

func (h *ClerkWebhookHandler) handleUserCreated(w http.ResponseWriter, r *http.Request, data json.RawMessage) {
	var u clerkUserData
	if err := json.Unmarshal(data, &u); err != nil {
		slog.Error("clerk webhook: failed to parse user.created data", "error", err)
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	if len(u.EmailAddresses) == 0 {
		slog.Error("clerk webhook: user created did not have email")
		http.Error(w, "no email address found", http.StatusBadRequest)
		return
	}
	req := &model.CreateUserRequest{
		ExternalId: u.ID,
		Email:      u.EmailAddresses[0].EmailAddress,
		Avatar:     nullString(u.ImageURL),
		FirstName:  nullStringPtr(u.FirstName),
		LastName:   nullStringPtr(u.LastName),
	}
	if _, err := h.User.Create(req); err != nil {
		if service.IsUniqueViolation(err) {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		slog.Error("clerk webhook: failed to create user", "error", err, "external_id", u.ID)
		http.Error(w, "failed to create user", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *ClerkWebhookHandler) handleUserUpdated(w http.ResponseWriter, data json.RawMessage) {
	var u clerkUserData
	if err := json.Unmarshal(data, &u); err != nil {
		slog.Error("clerk webhook: failed to parse user.updated data", "error", err)
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	req := &model.UpdateUserRequest{
		ExternalId: u.ID,
		Avatar:     nullString(u.ImageURL),
		FirstName:  nullStringPtr(u.FirstName),
		LastName:   nullStringPtr(u.LastName),
	}
	if _, err := h.User.Update(req); err != nil {
		slog.Error("clerk webhook: failed to update user", "error", err, "external_id", u.ID)
		http.Error(w, "failed to update user", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *ClerkWebhookHandler) handleUserDeleted(w http.ResponseWriter, data json.RawMessage) {
	var u struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal(data, &u); err != nil || u.ID == "" {
		slog.Error("clerk webhook: failed to parse user.deleted data", "error", err)
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	if _, err := h.User.Delete(u.ID); err != nil {
		slog.Error("clerk webhook: failed to delete user", "error", err, "external_id", u.ID)
		http.Error(w, "failed to delete user", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func nullString(s string) sql.NullString {
	return sql.NullString{String: s, Valid: s != ""}
}

func nullStringPtr(s *string) sql.NullString {
	if s == nil {
		return sql.NullString{}
	}
	return sql.NullString{String: *s, Valid: true}
}

// SetClerkKey configures the global Clerk API key used for SDK calls.
func SetClerkKey(secretKey string) {
	clerk.SetKey(secretKey)
}
