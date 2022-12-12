package directory

import (
	"context"
	"errors"
	"net/http"
)

// Injector makes sure the context is filled with the
// information provided by the JWT.
func Injector(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// TODO: inject namespace from context claims
		ctx := context.WithValue(r.Context(), NAMESPACE_KEY, NONSAAS_DIR_KEY)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func NewGlobalContext() context.Context {
	ctx := context.Background()
	ctx = context.WithValue(ctx, NAMESPACE_KEY, GLOBAL_DIR_KEY)
	return ctx
}

func NewContextWithNameSpace(ns NamespaceID) context.Context {
	ctx := context.Background()
	ctx = context.WithValue(ctx, NAMESPACE_KEY, ns)
	return ctx
}

func ExtractNamespace(ctx context.Context) (NamespaceID, error) {
	namespace := ctx.Value(NAMESPACE_KEY)
	if namespace == nil {
		return "", errors.New("Missing namespace")
	}
	key, ok := namespace.(NamespaceID)
	if !ok {
		return "", errors.New("Wrong namespace type")
	}
	return key, nil
}
