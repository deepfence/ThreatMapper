//go:build dummy
// +build dummy

package main

import (
	"fmt"
	"math/rand"
	"time"
)

func init() {
	rand.Seed(time.Now().UnixNano()) // Initialize random seed

	min := 0
	max := 120 // 2 minutes = 120 seconds

	// Generate a random number within the given range
	randomSeconds := rand.Intn(max-min+1) + min

	sleepDuration := time.Duration(randomSeconds) * time.Second
	fmt.Printf("Sleeping for %d seconds...\n", randomSeconds)

	time.Sleep(sleepDuration)

	fmt.Println("Awake now!")
}
