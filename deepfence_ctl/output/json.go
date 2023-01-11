package output

import (
	"encoding/json"
	"fmt"
)

func out_json[T any](t T) error {
	b, err := json.Marshal(t)
	if err != nil {
		return err
	}
	fmt.Printf("%s\n", string(b))
	return nil
}
