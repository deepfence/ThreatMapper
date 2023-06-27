package email

import (
	"encoding/json"
	"fmt"
	"sort"

	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/sendemail"
)

// BatchSize todo: add support for batch size
const BatchSize = 100

func New(b []byte) (*Email, error) {
	h := Email{}
	err := json.Unmarshal(b, &h)
	if err != nil {
		return &h, err
	}
	return &h, nil
}

func (e Email) FormatMessage(message []map[string]interface{}) string {
	entiremsg := "*" + e.Resource + "*\n\n"

	//Prepare the sorted keys so that the output has the records in same order
	var keys []string
	if len(message) > 0 {
		keys = make([]string, 0, len(message[0]))
		for key, _ := range message[0] {
			keys = append(keys, key)
		}

		sort.Strings(keys)
	}

	entryFmt := "%s: %s\n"
	for k, v := range message {
		entiremsg = entiremsg + fmt.Sprintf("#%d\n", k+1)
		for _, key := range keys {
			if val, ok := v[key]; ok {
				fmtVal := ""
				if val != nil {
					fmtVal = fmt.Sprintf("%v", val)
				}
				entiremsg += fmt.Sprintf(entryFmt, key, fmtVal)
				delete(v, key)
			}
		}

		//This is to handle if we have unprocessed data in the map
		//Possilbe if all the records are not uniform
		for key, val := range v {
			fmtVal := ""
			if val != nil {
				fmtVal = fmt.Sprintf("%v", val)
			}

			entiremsg += fmt.Sprintf(entryFmt, key, fmtVal)
		}

		entiremsg = entiremsg + "\n"
	}
	return entiremsg
}

func (e Email) SendNotification(message string, extras map[string]interface{}) error {
	// formatting : unmarshal into payload
	var msg []map[string]interface{}
	err := json.Unmarshal([]byte(message), &msg)
	if err != nil {
		return err
	}
	m := e.FormatMessage(msg)
	emailSender, err := sendemail.NewEmailSender()
	if err != nil {
		return err
	}
	return emailSender.Send([]string{e.Config.EmailId}, "Deepfence Subscription", m, "", nil)
}
