package utils

import (
	"archive/zip"
	"bytes"
	"crypto/rand"
	"crypto/sha256"
	"crypto/tls"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"hash/fnv"
	"io"
	"math"
	"math/big"
	"net"
	"net/http"
	"net/mail"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"reflect"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	postgresqlDb "github.com/deepfence/ThreatMapper/deepfence_utils/postgresql/postgresql-db"
	"github.com/google/uuid"
	"github.com/lestrrat-go/jwx/v2/jwt"
)

var ScanIdReplacer = strings.NewReplacer("/", "_", ":", "_", ".", "_")

var (
	matchFirstCap = regexp.MustCompile("(.)([A-Z][a-z]+)")
	matchAllCap   = regexp.MustCompile("([a-z0-9])([A-Z])")
)

const (
	ansi = "[\u001B\u009B][[\\]()#;?]*(?:(?:(?:[a-zA-Z\\d]*(?:;[a-zA-Z\\d]*)*)?\u0007)|(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PRZcf-ntqry=><~]))"
)

var (
	removeAnsiColorRegex = regexp.MustCompile(ansi)
	emptyStrByte         = []byte("")
)

// StripAnsi remove ansi color from log lines
func StripAnsi(str []byte) []byte {
	return removeAnsiColorRegex.ReplaceAll(str, emptyStrByte)
}

// StripAnsiStr remove ansi color from log lines
func StripAnsiStr(str string) string {
	return removeAnsiColorRegex.ReplaceAllString(str, "")
}

type AgentID struct {
	Name string `json:"name"`
	Type string `json:"type"`
}

func ValidateEmail(email string) bool {
	_, err := mail.ParseAddress(email)
	return err == nil
}

func ToSnakeCase(str string) string {
	// EmailAddress => email_address
	snake := matchFirstCap.ReplaceAllString(str, "${1}_${2}")
	snake = matchAllCap.ReplaceAllString(snake, "${1}_${2}")
	return strings.ToLower(snake)
}

func NewUUIDString() string {
	return NewUUID().String()
}

func UUIDFromString(uuidStr string) (uuid.UUID, error) {
	return uuid.Parse(uuidStr)
}

func NewUUID() uuid.UUID {
	return uuid.New()
}

func GetEmailDomain(email string) (string, error) {
	domain := strings.Split(email, "@")
	if len(domain) != 2 {
		return "", errors.New("invalid domain")
	}
	return strings.ToLower(domain[1]), nil
}

func GetCustomerNamespace(s string) (string, error) {
	var result strings.Builder
	if s == "" {
		return "", errors.New("invalid input")
	}
	s = strings.ToLower(s)
	for i := 0; i < len(s); i++ {
		b := s[i]
		if ('a' <= b && b <= 'z') || ('0' <= b && b <= '9') || b == '-' {
			result.WriteByte(b)
		} else {
			result.WriteByte('-')
		}
	}
	namespace := result.String()
	if '0' <= namespace[0] && namespace[0] <= '9' || namespace[0] == '-' {
		namespace = "c-" + namespace
	}
	lastCharPos := len(namespace) - 1
	if '0' <= namespace[lastCharPos] && namespace[lastCharPos] <= '9' || namespace[lastCharPos] == '-' {
		namespace = namespace + "-c"
	}
	if len(namespace) > 63 {
		return "", errors.New("at most 63 characters allowed")
	}
	return namespace, nil
}

func RemoveURLPath(inUrl string) (string, error) {
	u, err := url.Parse(inUrl)
	if err != nil {
		return inUrl, err
	}
	u.Path = ""
	u.User = nil
	u.RawQuery = ""
	u.Fragment = ""
	return u.String(), nil
}

func InterfaceToInt(a interface{}) (int64, error) {
	aValue := reflect.ValueOf(a)
	switch aValue.Kind() {
	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
		return aValue.Int(), nil
	case reflect.Float32, reflect.Float64:
		return int64(aValue.Float()), nil
	case reflect.String:
		return strconv.ParseInt(aValue.String(), 10, 64)
	default:
		return 0, errors.New("type error")
	}
}

func IsJWTExpired(token string) bool {
	parsed, err := jwt.Parse([]byte(token), jwt.WithVerify(false))
	if err != nil {
		return true
	}
	return parsed.Expiration().Before(time.Now())
}

func GetInt64ValueFromInterfaceMap(claims map[string]interface{}, key string) (int64, error) {
	val, ok := claims[key]
	if !ok {
		return 0, errors.New(fmt.Sprintf("key %s not found in JWT claims", key))
	}
	number, err := InterfaceToInt(val)
	if err != nil {
		return 0, errors.New("cannot parse jwt")
	}
	return number, nil
}

func GetStringValueFromInterfaceMap(claims map[string]interface{}, key string) (string, error) {
	val, ok := claims[key]
	if !ok {
		return "", errors.New(fmt.Sprintf("key %s not found in JWT claims", key))
	}
	return fmt.Sprintf("%v", val), nil
}

func StructToMap[T any](c T) map[string]interface{} {
	t := reflect.TypeOf(c)
	v := reflect.ValueOf(c)

	num_fields := 0
	for i := 0; i < t.NumField(); i++ {
		key := t.Field(i).Tag.Get("json")
		if strings.HasSuffix(key, ",omitempty") {
			if v.Field(i).IsZero() {
				continue
			}
		}
		num_fields += 1
	}

	bb := make(map[string]interface{}, num_fields)

	for i := 0; i < t.NumField(); i++ {
		key := t.Field(i).Tag.Get("json")
		omitempty := strings.HasSuffix(key, ",omitempty")
		if omitempty {
			if v.Field(i).IsZero() {
				continue
			}
			key = strings.TrimSuffix(key, ",omitempty")
		}
		bb[key] = v.Field(i).Interface()
	}

	return bb
}

// TODO: check if StructToMap can replace ToMap
func ToMap[T any](c T) map[string]interface{} {
	bb := map[string]interface{}{}

	t := reflect.TypeOf(c)
	v := reflect.ValueOf(c)

	for i := 0; i < t.NumField(); i++ {
		bb[t.Field(i).Tag.Get("json")] = v.Field(i).Interface()
	}

	return bb
}

// FromMap Convert map[string]interface{} into structs
// e.g:
//
//	type Titi struct {
//		Tata string `json:"tata"`
//	}
//
//	type Toto struct {
//		Foo  string   `json:"foo"`
//		Bar  int      `json:"bar"`
//		Ta   Titi     `json:"ta"`
//		Tas  []Titi   `json:"tas"`
//		Tass []string `json:"tass"`
//	}
//
//	m := map[string]interface{}{
//		"foo": "toto",
//		"bar": 42,
//		"ta": map[string]interface{}{"tata": "ok"},
//		"tas": []map[string]interface{}{{"tata": "ok2"}, {"tata": "ok1"}},
//		"tass": []string{"a"},
//	}
//
// var t Toto
// FromMap(m, &t)
func FromMap(bb map[string]interface{}, c interface{}) {
	v := reflect.Indirect(reflect.ValueOf(c))
	t := v.Type()

	for i := 0; i < t.NumField(); i++ {
		data, has := bb[t.Field(i).Tag.Get("json")]
		if !has || data == nil {
			continue
		}
		if t.Field(i).Tag.Get("nested_json") == "true" {
			tmp := map[string]interface{}{}
			json.Unmarshal([]byte(data.(string)), &tmp)
			data = tmp
		}
		if t.Field(i).Type.Kind() == reflect.Slice {
			slice, ok := data.([]map[string]interface{})
			if !ok {
				if t.Field(i).Type.Elem().Kind() == reflect.String {
					//We are not able to convert the []interface{} to []string
					//Hence we need to have this special handling
					var outStr []string
					rv := reflect.ValueOf(data)
					for i := 0; i < rv.Len(); i++ {
						outStr = append(outStr, rv.Index(i).Interface().(string))
					}
					vv := reflect.ValueOf(outStr).Convert(t.Field(i).Type)
					v.Field(i).Set(vv)
				} else {
					vv := reflect.ValueOf(data).Convert(t.Field(i).Type)
					v.Field(i).Set(vv)
				}

				continue
			}
			tmp := reflect.MakeSlice(t.Field(i).Type, 0, len(slice))
			for j := range slice {
				tmp2 := reflect.New(t.Field(i).Type.Elem())
				FromMap(slice[j], tmp2.Interface())
				tmp = reflect.Append(tmp, reflect.Indirect(tmp2))
			}
			v.Field(i).Set(tmp)
		} else if t.Field(i).Type.Kind() == reflect.Struct {
			struc, ok := data.(map[string]interface{})
			if !ok {
				continue
			}
			tmp := reflect.New(t.Field(i).Type)
			FromMap(struc, tmp.Interface())
			v.Field(i).Set(reflect.Indirect(tmp))
		} else {
			vv := reflect.ValueOf(data).Convert(t.Field(i).Type)
			v.Field(i).Set(vv)
		}
	}
}

func GetTimestamp() int64 {
	return time.Now().UTC().UnixNano() / 1000000
}

func GetCurrentDatetime() time.Time {
	return time.Now().UTC()
}

func GetDatetimeNow() string {
	return time.Now().UTC().Format("2006-01-02T15:04:05.000") + "Z"
}

func MapKeys(input map[string]string) []int32 {
	keys := make([]int32, len(input))
	i := 0
	for k := range input {
		key, err := strconv.ParseInt(k, 10, 32)
		if err != nil {
			continue
		}
		keys[i] = int32(key)
		i++
	}
	return keys
}

func ExecuteCommand(commandStr string, envVars map[string]string) (string, error) {
	cmd := exec.Command("/bin/sh", "-c", commandStr)
	var commandOut bytes.Buffer
	var commandErr bytes.Buffer
	cmd.Stdout = &commandOut
	cmd.Stderr = &commandErr
	cmd.Env = os.Environ()
	for key, value := range envVars {
		cmd.Env = append(cmd.Env, fmt.Sprintf("%s=%s", key, value))
	}
	err := cmd.Run()
	if err != nil {
		return strings.TrimSpace(commandErr.String()), err
	}
	return strings.TrimSpace(commandOut.String()), nil
}

func InSlice[T comparable](e T, s []T) bool {
	for _, v := range s {
		if v == e {
			return true
		}
	}
	return false
}

func FileExists(name string) bool {
	// Reports whether the named file or directory exists.
	if _, err := os.Stat(name); err != nil {
		if os.IsNotExist(err) {
			return false
		}
	}
	return true
}

func RecursiveZip(pathsToZip []string, excludePathPrefixes []string, destinationPath string) error {
	destinationFile, err := os.Create(destinationPath)
	if err != nil {
		return err
	}
	excludePathsSet := len(excludePathPrefixes) > 0
	myZip := zip.NewWriter(destinationFile)
	for _, pathToZip := range pathsToZip {
		if !FileExists(pathToZip) {
			continue
		}
		err = filepath.Walk(pathToZip, func(filePath string, info os.FileInfo, err error) error {
			if err != nil {
				return err
			}
			if info.IsDir() {
				return nil
			}
			if excludePathsSet {
				for _, v := range excludePathPrefixes {
					if strings.HasPrefix(filePath, v) {
						return nil
					}
				}
			}
			relPath := strings.TrimPrefix(filePath, filepath.Dir(pathToZip))
			zipFile, err := myZip.Create(relPath)
			if err != nil {
				return err
			}
			fsFile, err := os.Open(filePath)
			if err != nil {
				return err
			}
			_, err = io.Copy(zipFile, fsFile)
			if err != nil {
				return err
			}
			return nil
		})
		if err != nil {
			log.Warn().Msg(err.Error())
			continue
		}
	}
	err = myZip.Close()
	if err != nil {
		return err
	}
	return nil
}

func UploadFile(url string, fileName string) ([]byte, int, error) {
	r, err := os.Open(fileName)
	if err != nil {
		return nil, 0, err
	}
	buf := make([]byte, 512)
	_, err = r.Read(buf)
	if err != nil {
		return nil, 0, err
	}
	r.Close()

	client, err := NewHTTPClient()
	if err != nil {
		return nil, 0, err
	}
	r, err = os.Open(fileName)
	req, err := http.NewRequest("PUT", url, r)
	if err != nil {
		return nil, 0, err
	}
	req.Header.Add("Content-Type", http.DetectContentType(buf))
	res, err := client.Do(req)
	if err != nil {
		return nil, 0, err
	}
	defer res.Body.Close()

	body, err := io.ReadAll(res.Body)
	if err != nil {
		return nil, 0, err
	}
	return body, res.StatusCode, nil
}

func NewHTTPClient() (*http.Client, error) {
	// Set up our own certificate pool
	tlsConfig := &tls.Config{RootCAs: x509.NewCertPool(), InsecureSkipVerify: true}
	client := &http.Client{
		Transport: &http.Transport{
			TLSClientConfig:     tlsConfig,
			DisableKeepAlives:   false,
			MaxIdleConnsPerHost: 1024,
			DialContext: (&net.Dialer{
				Timeout:   10 * time.Second,
				KeepAlive: 15 * time.Minute,
			}).DialContext,
			TLSHandshakeTimeout:   10 * time.Second,
			ResponseHeaderTimeout: 5 * time.Minute,
		},
		Timeout: 15 * time.Minute,
	}
	return client, nil
}

func GenerateRandomNumber(numberOfDigits int) (int64, error) {
	maxLimit := int64(math.Pow10(numberOfDigits)) - 1
	lowLimit := int64(math.Pow10(numberOfDigits - 1))

	randomNumber, err := rand.Int(rand.Reader, big.NewInt(maxLimit))
	if err != nil {
		return 0, err
	}
	randomNumberInt := randomNumber.Int64()

	// Handling integers between 0, 10^(n-1) .. for n=4, handling cases between (0, 999)
	if randomNumberInt <= lowLimit {
		randomNumberInt += lowLimit
	}

	// Never likely to occur, kust for safe side.
	if randomNumberInt > maxLimit {
		randomNumberInt = maxLimit
	}
	return randomNumberInt, nil
}

func StringArrayToInterfaceArray(a []string) []interface{} {
	l := make([]interface{}, 0)
	for _, i := range a {
		l = append(l, i)
	}
	return l
}

func BoolArrayToInterfaceArray(a []bool) []interface{} {
	l := make([]interface{}, 0)
	for _, i := range a {
		l = append(l, i)
	}
	return l
}

func GetScheduledJobHash(schedule postgresqlDb.Scheduler) string {
	var payload map[string]string
	json.Unmarshal(schedule.Payload, &payload)
	message := map[string]interface{}{"action": schedule.Action, "payload": payload, "cron": schedule.CronExpr}
	scheduleStr, _ := json.Marshal(message)
	return GenerateHashFromString(string(scheduleStr))
}

func GenerateHashFromString(s string) string {
	h := fnv.New32a()
	h.Write([]byte(s))
	return fmt.Sprintf("%x", h.Sum32())
}

func SHA256sum(data []byte) string {
	hash := sha256.New()
	hash.Write(data)
	return fmt.Sprintf("sha256:%x", hash.Sum(nil))
}

func GetEnvOrDefault(envVar string, defaultValue string) string {
	envValue, has := os.LookupEnv(envVar)
	if !has {
		return defaultValue
	}
	return envValue
}

func URLEncode(s string) string {
	return url.QueryEscape(s)
}

func GetErrorRedirectUrl(consoleUrl, errorMessage string) string {
	return consoleUrl + "/?errorMessage=" + URLEncode(errorMessage)
}

func GetInfoRedirectUrl(consoleUrl, message string) string {
	return consoleUrl + "/auth/sso?message=" + URLEncode(message)
}

func RandomString(nByte int) (string, error) {
	b := make([]byte, nByte)
	if _, err := io.ReadFull(rand.Reader, b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

func SetCookie(w http.ResponseWriter, r *http.Request, name, value, path string) {
	c := &http.Cookie{
		Name:     name,
		Value:    value,
		MaxAge:   int(time.Hour.Seconds()),
		Secure:   r.TLS != nil,
		HttpOnly: true,
		Path:     path,
	}
	http.SetCookie(w, c)
}

func SplitFullName(name string) (string, string) {
	var (
		firstName string
		lastName  string
	)
	names := strings.Split(name, " ")
	switch len(names) {
	case 1:
		firstName = names[0]
		lastName = names[0]
	default:
		firstName = names[0]
		lastName = names[len(names)-1]
	}
	return firstName, lastName
}
