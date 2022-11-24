package authorization

import (
	"fmt"
	"github.com/deepfence/ThreatMapper/deepfence_server/common"
	"github.com/go-chi/jwtauth/v5"
	"github.com/go-chi/render"
	"net/http"
	"strings"
)

func stringSliceToInterfaceSlice(s []string) []interface{} {
	res := make([]interface{}, len(s))
	for i, v := range s {
		res[i] = v
	}
	return res
}

func CasbinHandler(permission string, h http.HandlerFunc) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		_, claims, _ := jwtauth.FromContext(r.Context())
		fmt.Println(claims["role"])
		vals := append([]string{claims["role"].(string)}, strings.Split(permission, ":")...)
		enforce, err := common.CasbinEnforcer.Enforce(stringSliceToInterfaceSlice(vals)...)
		fmt.Println(enforce, err)
		if err != nil {
			render.Status(r, http.StatusInternalServerError)
			return
		}
		if enforce {
			h(w, r)
		} else {
			render.Status(r, http.StatusUnauthorized)
			return
		}
	}
}
