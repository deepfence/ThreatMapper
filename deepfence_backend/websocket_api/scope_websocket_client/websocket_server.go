package main

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"flag"
	"fmt"
	"github.com/gomodule/redigo/redis"
	"github.com/gorilla/websocket"
	_ "github.com/lib/pq"
	"github.com/satori/go.uuid"
	"log"
	"net/http"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"sync"
	"time"
)

const (
	serverAddress                 = ":4041"
	wsPath                        = "/ws"
	supervisorProcessClient       = "scope-ws-client-process"
	supervisorProcessByNameClient = "scope-ws-client-process-by-name"
)

var (
	store         *Store
	redisDbNumber int
	redisPubSub   *redis.PubSubConn
	redisPool     *redis.Pool
	postgresDb    *sql.DB
)

func init() {
	redisDbNumber = getRedisDbNumber()
	redisPool, _ = newRedisPool()
	store = &Store{
		Users: make([]*User, 0, 1),
	}
	var err error
	postgresPort := 5432
	postgresPortStr := os.Getenv("POSTGRES_USER_DB_PORT")
	if postgresPortStr != "" {
		postgresPort, err = strconv.Atoi(postgresPortStr)
		if err != nil {
			postgresPort = 5432
		}
	}
	psqlInfo := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		os.Getenv("POSTGRES_USER_DB_HOST"), postgresPort, os.Getenv("POSTGRES_USER_DB_USER"),
		os.Getenv("POSTGRES_USER_DB_PASSWORD"), os.Getenv("POSTGRES_USER_DB_NAME"),
		os.Getenv("POSTGRES_USER_DB_SSLMODE"))
	postgresDb, err = sql.Open("postgres", psqlInfo)
	if err != nil {
		time.Sleep(time.Second * 2)
		os.Exit(1)
	}
	err = postgresDb.Ping()
	if err != nil {
		time.Sleep(time.Second * 2)
		os.Exit(1)
	}
}

func getRedisDbNumber() int {
	var dbNumInt int
	var errVal error
	dbNumStr := os.Getenv("REDIS_DB_NUMBER")
	if dbNumStr == "" {
		dbNumInt = 0
	} else {
		dbNumInt, errVal = strconv.Atoi(dbNumStr)
		if errVal != nil {
			dbNumInt = 0
		}
	}
	return dbNumInt
}

type User struct {
	ID              string
	TopologyOptions *TopologyOptions
	WsConn          *websocket.Conn
}

type Store struct {
	Users []*User
	sync.Mutex
}

func (store *Store) removeUser(u *User) {
	store.Lock()
	defer store.Unlock()

	otherUsersSubscribedToThisChannel := false
	for i, v := range store.Users {
		if v.ID == u.ID {
			store.Users = append(store.Users[:i], store.Users[i+1:]...)
		} else {
			if v.TopologyOptions.Channel == u.TopologyOptions.Channel {
				otherUsersSubscribedToThisChannel = true
			}
		}
	}
	if otherUsersSubscribedToThisChannel == false {
		err := redisPubSub.Unsubscribe(fmt.Sprintf("%s_%d", u.TopologyOptions.Channel, redisDbNumber))
		if err != nil {
			fmt.Println("error on redisPubSub.Unsubscribe")
		}
	}
}

func (store *Store) newUser(wsConn *websocket.Conn, topologyOptions *TopologyOptions) (*User, error) {
	uuidBytes := uuid.NewV4()
	user := &User{
		ID:              uuidBytes.String(),
		WsConn:          wsConn,
		TopologyOptions: topologyOptions,
	}
	if topologyOptions.NodeType == NodeTypeProcess {
		command := fmt.Sprintf("/usr/local/bin/supervisorctl start %s", supervisorProcessClient)
		executeCommand(command)
		time.Sleep(10 * time.Second)
	}
	if topologyOptions.NodeType == NodeTypeProcessByName {
		command := fmt.Sprintf("/usr/local/bin/supervisorctl start %s", supervisorProcessByNameClient)
		executeCommand(command)
		time.Sleep(10 * time.Second)
	}
	//
	// First reply will contain reset=True and all current topology data
	//
	redisConn := redisPool.Get()
	defer redisConn.Close()

	topologyJson, err := FetchTopologyData(redisConn, topologyOptions.Channel)
	if err != nil {
		return nil, err
	}
	if topologyOptions.Params.Format == TopologyFormatScope {
		var topology map[string]ScopeTopology
		err = json.Unmarshal(topologyJson, &topology)
		if err != nil {
			return nil, err
		}
		topologyVals := make([]ScopeTopology, len(topology))
		count := 0
		for _, nodeDetail := range topology {
			topologyVals[count] = nodeDetail
			count += 1
		}
		topologyDiff := ScopeTopologyDiff{Add: topologyVals, Options: *topologyOptions, Reset: true}
		topologyDiffJson, _ := JsonEncode(topologyDiff)
		if err := user.WsConn.WriteMessage(websocket.TextMessage, topologyDiffJson); err != nil {
			log.Printf("error sending initial topology: %s\n", err)
			return nil, err
		}
	} else if topologyOptions.Params.Format == TopologyFormatDeepfence {
		var topology map[string]DeepfenceTopology
		err = json.Unmarshal(topologyJson, &topology)
		if err != nil {
			return nil, err
		}
		topologyVals := make([]DeepfenceTopology, len(topology))
		count := 0
		for _, nodeDetail := range topology {
			topologyVals[count] = nodeDetail
			count += 1
		}
		topologyDiff := DeepfenceTopologyDiff{Add: topologyVals, Options: *topologyOptions, Reset: true}
		topologyDiffJson, _ := JsonEncode(topologyDiff)
		if err := user.WsConn.WriteMessage(websocket.TextMessage, topologyDiffJson); err != nil {
			log.Printf("error sending initial topology: %s\n", err)
			return nil, err
		}
	}
	store.Lock()
	defer store.Unlock()
	//
	// Subsequent replies will only contain diffs
	//
	toSubscribe := true
	for _, v := range store.Users {
		if topologyOptions.Channel == v.TopologyOptions.Channel {
			toSubscribe = false
			break
		}
	}
	if toSubscribe == true {
		if err := redisPubSub.Subscribe(fmt.Sprintf("%s_%d", topologyOptions.Channel, redisDbNumber)); err != nil {
			return user, err
		}
	}
	store.Users = append(store.Users, user)
	return user, nil
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func wsHandler(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("upgrader error %s\n" + err.Error())
		return
	}
	defer conn.Close()
	if err := r.ParseForm(); err != nil {
		log.Printf("parseForm error %s\n" + err.Error())
		return
	}
	topologyOptions := &TopologyOptions{
		NodeType: r.FormValue("node_type"),
		Params: TopologyParams{
			Format:      r.FormValue("format"),
			Stopped:     r.FormValue("stopped"),
			Pseudo:      r.FormValue("pseudo"),
			Unconnected: r.FormValue("unconnected"),
			Namespace:   r.FormValue("namespace")}}
	topologyOptions.TopologyOptionsValidate()
	apiKey := strings.TrimSpace(r.FormValue("api_key"))
	if apiKey == "" {
		return
	}
	// Verify apiKey
	userId := ""
	err = postgresDb.QueryRow("SELECT id from \"user\" WHERE api_key=$1;", apiKey).Scan(&userId)
	if err != nil {
		log.Printf("postgresDb error %s\n" + err.Error())
		return
	}
	if userId == "" {
		log.Printf("No user found for apiKey %s\n", apiKey)
		return
	}
	user, err := store.newUser(conn, topologyOptions)
	if err != nil {
		log.Printf("error on newUser. %s\n", err.Error())
		return
	}

	for {
		if _, _, err := user.WsConn.ReadMessage(); err == nil {
			// Wait for messages from client, but don't need to do anything.
			// If connection is closed by client, this will throw error and be handled.
		} else {
			log.Printf("error on WsConn.ReadMessage %s\n", err.Error())
			_ = user.WsConn.Close()
			store.removeUser(user)
			return
		}
	}
}

func deliverMessages() {
	for {
		switch v := redisPubSub.Receive().(type) {
		case redis.Message:
			store.findAndDeliver(v.Channel, v.Data)
		case redis.Subscription:
			// log.Printf("subscription message: %s: %s %d\n", v.Channel, v.Kind, v.Count)
		case error:
			log.Printf("error pub/sub on connection, delivery has stopped: %s", v.Error())
			os.Exit(1)
		}
	}
}

func (store *Store) findAndDeliver(channelID string, msg []byte) {
	var users []*User
	store.Lock()
	for _, user := range store.Users {
		users = append(users, user)
	}
	store.Unlock()
	for _, user := range users {
		if fmt.Sprintf("%s_%d", user.TopologyOptions.Channel, redisDbNumber) == channelID {
			err := user.WsConn.WriteMessage(websocket.TextMessage, msg)
			if err != nil {
				log.Printf("error on message delivery through ws. e: %s\n", err)
				_ = user.WsConn.Close()
				store.removeUser(user)
			}
		}
	}
}

func executeCommand(commandStr string) (string, error) {
	cmd := exec.Command("/bin/sh", "-c", commandStr)
	var commandOut bytes.Buffer
	var commandErr bytes.Buffer
	cmd.Stdout = &commandOut
	cmd.Stderr = &commandErr
	err := cmd.Run()
	if err != nil {
		return strings.TrimSpace(commandErr.String()), err
	}
	return strings.TrimSpace(commandOut.String()), nil
}

func handleProcessWebsocketClient() {
	// If nobody is consuming process / process_by_name, turn off process websocket client to scope
	ticker := time.NewTicker(1 * time.Minute)
	for {
		select {
		case <-ticker.C:
			store.Lock()
			processConsumed := false
			processByNameConsumed := false
			for _, user := range store.Users {
				if user.TopologyOptions.NodeType == NodeTypeProcess {
					processConsumed = true
				}
				if user.TopologyOptions.NodeType == NodeTypeProcessByName {
					processByNameConsumed = true
				}
			}
			if !processConsumed {
				command := fmt.Sprintf("/usr/local/bin/supervisorctl stop %s", supervisorProcessClient)
				executeCommand(command)
			}
			if !processByNameConsumed {
				command := fmt.Sprintf("/usr/local/bin/supervisorctl stop %s", supervisorProcessByNameClient)
				executeCommand(command)
			}
			store.Unlock()
		}
	}
}

func main() {
	flag.Parse()
	log.SetFlags(0)
	redisConn := redisPool.Get()
	defer redisConn.Close()

	redisPubSub = &redis.PubSubConn{Conn: redisConn}
	defer redisPubSub.Close()

	go deliverMessages()
	go handleProcessWebsocketClient()

	http.HandleFunc(wsPath, wsHandler)

	log.Printf("server started at %s\n", serverAddress)
	log.Fatal(http.ListenAndServe(serverAddress, nil))
}
