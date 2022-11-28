package directory

import (
	"context"
	"errors"
)

func NewAccountContext() context.Context {
	ctx := context.Background()
	ctx = context.WithValue(ctx, NAMESPACE_KEY, NONSAAS_DIR_KEY)
	return ctx
}

func NewGlobalContext() context.Context {
	ctx := context.Background()
	ctx = context.WithValue(ctx, NAMESPACE_KEY, GLOBAL_DIR_KEY)
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
