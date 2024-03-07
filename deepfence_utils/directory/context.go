package directory

import (
	"context"
	"errors"
	"net/http"

	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/go-chi/jwtauth/v5"
	"github.com/lestrrat-go/jwx/v2/jwt"
)

var ErrNamespaceNotFound = errors.New("namespace/tenet-id not found")

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

		//nolint:staticcheck
		ctx := context.WithValue(r.Context(), NamespaceKey, NamespaceID(namespace))
		// Token is authenticated, pass it through
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func CheckLicenseActive(next http.Handler) http.Handler {
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
		licenseActive, err := utils.GetBoolValueFromInterfaceMap(claims, LicenseActiveKey)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		if !licenseActive {
			http.Error(w, http.StatusText(http.StatusPaymentRequired), http.StatusPaymentRequired)
			return
		}
		// Token is authenticated, pass it through
		next.ServeHTTP(w, r)
	})
}

func NewGlobalContext() context.Context {
	ctx := context.Background()
	//nolint:staticcheck
	ctx = context.WithValue(ctx, NamespaceKey, GlobalDirKey)
	return ctx
}

func WithGlobalContext(ctx context.Context) context.Context {
	//nolint:staticcheck
	return context.WithValue(ctx, NamespaceKey, GlobalDirKey)
}

func WithDatabaseContext(ctx context.Context) context.Context {
	//nolint:staticcheck
	return context.WithValue(ctx, NamespaceKey, DatabaseDirKey)
}

func NewContextWithNameSpace(ns NamespaceID) context.Context {
	ctx := context.Background()
	//nolint:staticcheck
	ctx = context.WithValue(ctx, NamespaceKey, ns)
	return ctx
}

func ContextWithNameSpace(ctx context.Context, ns NamespaceID) context.Context {
	//nolint:staticcheck
	return context.WithValue(ctx, NamespaceKey, ns)
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
