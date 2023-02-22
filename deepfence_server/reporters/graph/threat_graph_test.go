package reporters_graph

import (
	"testing"

	"gotest.tools/assert"
)

func Test_build_attack_path_regular(t *testing.T) {

	ap := AttackPaths{
		nodes_tree: map[int64][]int64{0: {1}, 1: {2}},
		nodes_data: map[int64]AttackPathData{
			0: {
				identity:               0,
				Node_type:              "host",
				cloud_provider:         "others",
				depth:                  0,
				sum_sum_cve:            10,
				sum_sum_secrets:        10,
				sum_sum_compliance:     10,
				node_count:             1,
				collect_node_id:        []string{"id0"},
				collect_num_cve:        []int64{10},
				collect_num_secrets:    []int64{10},
				collect_num_compliance: []int64{10},
			},
			1: {
				identity:               1,
				Node_type:              "host",
				cloud_provider:         "others",
				depth:                  1,
				sum_sum_cve:            10,
				sum_sum_secrets:        10,
				sum_sum_compliance:     10,
				node_count:             1,
				collect_node_id:        []string{"id1"},
				collect_num_cve:        []int64{10},
				collect_num_secrets:    []int64{10},
				collect_num_compliance: []int64{10},
			},
			2: {
				identity:               2,
				Node_type:              "host",
				cloud_provider:         "others",
				depth:                  2,
				sum_sum_cve:            10,
				sum_sum_secrets:        10,
				sum_sum_compliance:     10,
				node_count:             1,
				collect_node_id:        []string{"id2"},
				collect_num_cve:        []int64{10},
				collect_num_secrets:    []int64{10},
				collect_num_compliance: []int64{10},
			},
		},
		nodes_depth: map[int64][]int64{
			0: {0},
			1: {1},
			2: {2},
		},
	}
	visited := map[int64]struct{}{}
	res := build_attack_paths(ap, 0, visited)

	assert.Equal(t, len(res), 1, "should be equal")
	assert.Equal(t, len(res[0]), 3, "should be equal")
	assert.Equal(t, res[0][0], int64(0), "should be equal")
	assert.Equal(t, res[0][1], int64(1), "should be equal")
	assert.Equal(t, res[0][2], int64(2), "should be equal")
}

func Test_build_attack_path_2_paths(t *testing.T) {

	ap := AttackPaths{
		nodes_tree: map[int64][]int64{0: {1}, 1: {2, 3}},
		nodes_data: map[int64]AttackPathData{
			0: {
				identity:               0,
				Node_type:              "host",
				cloud_provider:         "others",
				depth:                  0,
				sum_sum_cve:            10,
				sum_sum_secrets:        10,
				sum_sum_compliance:     10,
				node_count:             1,
				collect_node_id:        []string{"id0"},
				collect_num_cve:        []int64{10},
				collect_num_secrets:    []int64{10},
				collect_num_compliance: []int64{10},
			},
			1: {
				identity:               1,
				Node_type:              "host",
				cloud_provider:         "others",
				depth:                  1,
				sum_sum_cve:            10,
				sum_sum_secrets:        10,
				sum_sum_compliance:     10,
				node_count:             1,
				collect_node_id:        []string{"id1"},
				collect_num_cve:        []int64{10},
				collect_num_secrets:    []int64{10},
				collect_num_compliance: []int64{10},
			},
			2: {
				identity:               2,
				Node_type:              "host",
				cloud_provider:         "others",
				depth:                  2,
				sum_sum_cve:            10,
				sum_sum_secrets:        10,
				sum_sum_compliance:     10,
				node_count:             1,
				collect_node_id:        []string{"id2"},
				collect_num_cve:        []int64{10},
				collect_num_secrets:    []int64{10},
				collect_num_compliance: []int64{10},
			},
			3: {
				identity:               3,
				Node_type:              "host",
				cloud_provider:         "others",
				depth:                  2,
				sum_sum_cve:            10,
				sum_sum_secrets:        10,
				sum_sum_compliance:     10,
				node_count:             1,
				collect_node_id:        []string{"id3"},
				collect_num_cve:        []int64{10},
				collect_num_secrets:    []int64{10},
				collect_num_compliance: []int64{10},
			},
		},
		nodes_depth: map[int64][]int64{
			0: {0},
			1: {1},
			2: {2, 3},
		},
	}
	visited := map[int64]struct{}{}
	res := build_attack_paths(ap, 0, visited)

	assert.Equal(t, len(res), 2, "should be equal")
	assert.Equal(t, len(res[0]), 3, "should be equal")
	assert.Equal(t, res[0][0], int64(0), "should be equal")
	assert.Equal(t, res[0][1], int64(1), "should be equal")
	assert.Equal(t, res[0][2], int64(2), "should be equal")
	assert.Equal(t, len(res[1]), 3, "should be equal")
	assert.Equal(t, res[1][0], int64(0), "should be equal")
	assert.Equal(t, res[1][1], int64(1), "should be equal")
	assert.Equal(t, res[1][2], int64(3), "should be equal")
}
