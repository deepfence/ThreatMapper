package reporters_graph //nolint:stylecheck

import (
	"testing"

	"gotest.tools/assert"
)

func Test_build_attack_path_regular(t *testing.T) {

	ap := AttackPaths{
		nodesTree: map[int64][]int64{0: {1}, 1: {2}},
		nodesData: map[int64]AttackPathData{
			0: {
				identity:             0,
				NodeType:             "host",
				cloudProvider:        "others",
				depth:                0,
				sumSumCVE:            10,
				sumSumSecrets:        10,
				sumSumCompliance:     10,
				nodeCount:            1,
				collectNodeID:        []string{"id0"},
				collectNumCVE:        []int64{10},
				collectNumSecrets:    []int64{10},
				collectNumCompliance: []int64{10},
			},
			1: {
				identity:             1,
				NodeType:             "host",
				cloudProvider:        "others",
				depth:                1,
				sumSumCVE:            10,
				sumSumSecrets:        10,
				sumSumCompliance:     10,
				nodeCount:            1,
				collectNodeID:        []string{"id1"},
				collectNumCVE:        []int64{10},
				collectNumSecrets:    []int64{10},
				collectNumCompliance: []int64{10},
			},
			2: {
				identity:             2,
				NodeType:             "host",
				cloudProvider:        "others",
				depth:                2,
				sumSumCVE:            10,
				sumSumSecrets:        10,
				sumSumCompliance:     10,
				nodeCount:            1,
				collectNodeID:        []string{"id2"},
				collectNumCVE:        []int64{10},
				collectNumSecrets:    []int64{10},
				collectNumCompliance: []int64{10},
			},
		},
		nodesDepth: map[int64][]int64{
			0: {0},
			1: {1},
			2: {2},
		},
	}
	visited := map[int64]struct{}{}
	res := buildAttackPaths(ap, 0, visited)

	assert.Equal(t, len(res), 1, "should be equal")
	assert.Equal(t, len(res[0]), 3, "should be equal")
	assert.Equal(t, res[0][0], int64(0), "should be equal")
	assert.Equal(t, res[0][1], int64(1), "should be equal")
	assert.Equal(t, res[0][2], int64(2), "should be equal")
}

func Test_build_attack_path_2_paths(t *testing.T) {

	ap := AttackPaths{
		nodesTree: map[int64][]int64{0: {1}, 1: {2, 3}},
		nodesData: map[int64]AttackPathData{
			0: {
				identity:             0,
				NodeType:             "host",
				cloudProvider:        "others",
				depth:                0,
				sumSumCVE:            10,
				sumSumSecrets:        10,
				sumSumCompliance:     10,
				nodeCount:            1,
				collectNodeID:        []string{"id0"},
				collectNumCVE:        []int64{10},
				collectNumSecrets:    []int64{10},
				collectNumCompliance: []int64{10},
			},
			1: {
				identity:             1,
				NodeType:             "host",
				cloudProvider:        "others",
				depth:                1,
				sumSumCVE:            10,
				sumSumSecrets:        10,
				sumSumCompliance:     10,
				nodeCount:            1,
				collectNodeID:        []string{"id1"},
				collectNumCVE:        []int64{10},
				collectNumSecrets:    []int64{10},
				collectNumCompliance: []int64{10},
			},
			2: {
				identity:             2,
				NodeType:             "host",
				cloudProvider:        "others",
				depth:                2,
				sumSumCVE:            10,
				sumSumSecrets:        10,
				sumSumCompliance:     10,
				nodeCount:            1,
				collectNodeID:        []string{"id2"},
				collectNumCVE:        []int64{10},
				collectNumSecrets:    []int64{10},
				collectNumCompliance: []int64{10},
			},
			3: {
				identity:             3,
				NodeType:             "host",
				cloudProvider:        "others",
				depth:                2,
				sumSumCVE:            10,
				sumSumSecrets:        10,
				sumSumCompliance:     10,
				nodeCount:            1,
				collectNodeID:        []string{"id3"},
				collectNumCVE:        []int64{10},
				collectNumSecrets:    []int64{10},
				collectNumCompliance: []int64{10},
			},
		},
		nodesDepth: map[int64][]int64{
			0: {0},
			1: {1},
			2: {2, 3},
		},
	}
	visited := map[int64]struct{}{}
	res := buildAttackPaths(ap, 0, visited)

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
