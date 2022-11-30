package main

import (
	"database/sql/driver"
	"encoding/json"
	"errors"

	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
)

const (
	maskedCVEDBTable = "masked_cve"
	listAllQuery     = "SELECT cveid, nodes FROM masked_cve;"
	getQuery         = "SELECT nodes FROM masked_cve WHERE cveid=$1;"
	insertQuery      = "INSERT INTO masked_cve (cveid, nodes) VALUES ($1, $2) RETURNING cveid, nodes;"
	updateQuery      = "UPDATE masked_cve SET nodes=$2 WHERE cveid=$1 RETURNING cveid, nodes;"
	deleteQuery      = "DELETE FROM masked_cve WHERE cveid = $1;"
)

func (n Nodes) Value() (driver.Value, error) {
	return json.Marshal(n)
}

func (n *Nodes) Scan(value interface{}) error {
	b, ok := value.([]byte)
	if !ok {
		return errors.New("type assertion to []byte failed")
	}
	return json.Unmarshal(b, &n)
}

func listAllCVE(db *sqlx.DB) map[string]Nodes {
	all := map[string]Nodes{}
	rows, err := db.Query(listAllQuery)
	if err != nil {
		log.Error(err)
		return all
	}
	defer rows.Close()
	for rows.Next() {
		var (
			cveid string
			nodes Nodes
		)
		err = rows.Scan(&cveid, &nodes)
		if err != nil {
			log.Errorf("scan error: %s", err)
		}
		all[cveid] = nodes
		log.Infof("masked cve in db cveid:%s nodes: %s", cveid, nodes)
	}
	err = rows.Err()
	if err != nil {
		log.Errorf("error while listing all cve err: %s", err)
	}
	return all
}

func getCVE(db *sqlx.DB, cveid string) (Nodes, error) {
	var (
		nodes Nodes
		err   error
	)
	err = db.QueryRow(getQuery, cveid).Scan(&nodes)
	if err != nil {
		return nodes, err
	}
	return nodes, err
}

func insertCVE(db *sqlx.DB, cveid string, nodes Nodes) error {
	var (
		r_cveid string
		r_nodes Nodes
		err     error
	)
	err = db.QueryRow(insertQuery, cveid, nodes).Scan(&r_cveid, &r_nodes)
	if err != nil {
		return err
	}
	return nil
}

func updateCVE(db *sqlx.DB, cveid string, nodes Nodes) error {
	var (
		r_cveid string
		r_nodes Nodes
		err     error
	)
	err = db.QueryRow(updateQuery, cveid, nodes).Scan(&r_cveid, &r_nodes)
	if err != nil {
		return err
	}
	return nil
}

func deleteCVE(db *sqlx.DB, cveid string) error {
	_, err := db.Exec(deleteQuery, cveid)
	if err != nil {
		return err
	}
	return nil
}
