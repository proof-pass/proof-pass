package server

import (
	"net/http"
	"regexp"
	"strings"

	"github.com/proof-pass/proof-pass/backend/jwt"
	"github.com/proof-pass/proof-pass/backend/util"
)

// corsMiddleware sets the necessary headers for CORS
func corsMiddleware(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// TODO: Set the allowed origins
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Allow-Credentials", "true")

		// If this is a preflight request, then we stop further handling
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		h.ServeHTTP(w, r)
	})
}

// authMiddleware checks the Authorization header for a valid JWT
func authMiddleware(h http.Handler, jwtService *jwt.Service) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Skip authentication for health check and preflight requests
		if r.URL.Path == "/v1/health" ||
			r.Method == http.MethodOptions ||
			r.URL.Path == "/v1/user/login" ||
			r.URL.Path == "/v1/user/request-verification-code" ||
			(r.Method == http.MethodGet && r.URL.Path == "/v1/events") ||
			(r.Method == http.MethodGet && regexp.MustCompile("^/v1/events/[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-4[a-fA-F0-9]{3}-[8|9|aA|bB][a-fA-F0-9]{3}-[a-fA-F0-9]{12}$").MatchString(r.URL.Path)) ||
			(r.Method == http.MethodPost && regexp.MustCompile("^/v1/events/[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-4[a-fA-F0-9]{3}-[8|9|aA|bB][a-fA-F0-9]{3}-[a-fA-F0-9]{12}/attendance$").MatchString(r.URL.Path)) {
			h.ServeHTTP(w, r)
			return
		}

		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, "Authorization header required", http.StatusUnauthorized)
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		claims, err := jwtService.ValidateJWT(tokenString)
		if err != nil {
			http.Error(w, "Invalid token", http.StatusUnauthorized)
			return
		}

		ctx := util.SetUserIDInContext(r.Context(), claims.ID)
		ctx = util.SetUserEmailInContext(ctx, claims.Email)

		h.ServeHTTP(w, r.WithContext(ctx))
	})
}
