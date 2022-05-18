package main

import (
	"database/sql"
	"database/sql/driver"
	"encoding/json"
	"errors"

	_ "github.com/lib/pq"
)

const (
	maskCveDbTable = "maskcve"
	listAllQuery   = "SELECT cveid, nodes FROM maskcve;"
	getQuery       = "SELECT nodes FROM maskcve WHERE cveid=$1;"
	insertQuery    = "INSERT INTO maskcve (cveid, nodes) VALUES ($1, $2) RETURNING cveid, nodes;"
	updateQuery    = "UPDATE maskcve SET nodes=$2 WHERE cveid=$1 RETURNING cveid, nodes;"
	deleteQuery    = "DELETE FROM maskcve WHERE cveid = $1;"
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

func listAllCVE(db *sql.DB) map[string]Nodes {
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
		log.Infof("present in db cveid:%s nodes: %s", cveid, nodes)
	}
	err = rows.Err()
	if err != nil {
		log.Errorf("error while listing all cve err: %s", err)
	}
	return all
}

func getCVE(db *sql.DB, cveid string) (Nodes, error) {
	var (
		nodes Nodes
		err   error
	)
	err = db.QueryRow(getQuery, cveid).Scan(&nodes)
	if err != nil {
		log.Errorf("%s for %s", err, cveid)
	}
	return nodes, err
}

func insertCVE(db *sql.DB, cveid string, nodes Nodes) error {
	var (
		r_cveid string
		r_nodes Nodes
		err     error
	)
	err = db.QueryRow(insertQuery, cveid, nodes).Scan(&r_cveid, &r_nodes)
	if err != nil {
		log.Errorf("failed to insert cveid %s err: %s", cveid, err)
		return err
	}
	log.Infof("inserted cveid:%s node:%s", r_cveid, r_nodes)
	return nil
}

func updateCVE(db *sql.DB, cveid string, nodes Nodes) error {
	var (
		r_cveid string
		r_nodes Nodes
		err     error
	)
	err = db.QueryRow(updateQuery, cveid, nodes).Scan(&r_cveid, &r_nodes)
	if err != nil {
		log.Errorf("failed to update cveid %s err: %s", cveid, err)
		return err
	}
	log.Infof("updated cveid:%s node:%s", r_cveid, r_nodes)
	return nil
}

func deleteCVE(db *sql.DB, cveid string) error {
	_, err := db.Exec(deleteQuery, cveid)
	if err != nil {
		log.Errorf("failed to delete cveid %s err: %s", cveid, err)
		return err
	}
	log.Infof("deleted cve id %s from db", cveid)
	return nil
}
