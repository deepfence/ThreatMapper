package directory

import (
	"context"
	"errors"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/go-chi/jwtauth/v5"
	"github.com/lestrrat-go/jwx/v2/jwt"
	"net/http"
)

// Injector makes sure the context is filled with the
// information provided by the JWT.
func Injector(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token, claims, err := jwtauth.FromContext(r.Context())
		if err != nil {
			http.Error(w, err.Error(), http.StatusUnauthorized)
			return
		}
		if token == nil || jwt.Validate(token) != nil {
			http.Error(w, http.StatusText(http.StatusUnauthorized), http.StatusUnauthorized)
			return
		}
		namespace, err := utils.GetStringValueFromInterfaceMap(claims, NamespaceKey)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		ctx := context.WithValue(r.Context(), NamespaceKey, NamespaceID(namespace))
		// Token is authenticated, pass it through
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func NewGlobalContext() context.Context {
	ctx := context.Background()
	ctx = context.WithValue(ctx, NamespaceKey, GlobalDirKey)
	return ctx
}

func NewContextWithNameSpace(ns NamespaceID) context.Context {
	ctx := context.Background()
	ctx = context.WithValue(ctx, NamespaceKey, ns)
	return ctx
}

func ExtractNamespace(ctx context.Context) (NamespaceID, error) {
	namespace := ctx.Value(NamespaceKey)
	if namespace == nil {
		return "", errors.New("missing namespace")
	}
	key, ok := namespace.(NamespaceID)
	if !ok {
		return "", errors.New("wrong namespace type")
	}
	return key, nil
}
