import G6 from "@antv/g6";
import { getNodeIcon } from "../multi-cloud/node-icons";

const getVMData = title => {
  return {
    type: 'vm',
    metadata: {
      name: title,
      cloud: 'AWS',
      service: 'EC2',
    },
    vulnerabilities: [
      {
        title: 'CVE-2015-8710',
        severity: 'HIGH',
        vector: 'network',
      },
      {
        title: 'CVE-2022-1154',
        severity: 'LOW',
        vector: 'network',
      },
    ],
    secrets: [
      {
        title: 'AWS Session Token',
        severity: 'HIGH',
      },
      {
        title: 'AWS Secret Access Key',
        severity: 'LOW',
      },
    ],
    compliance: [
      {
        title: 'Enable Randomized Layout of Virtual Address Space',
        type: 'NIST',
      },
      {
        title: 'Disable SSH Root Login',
        type: 'HIPAA',
      },
    ],
  };
};



const getServiceData = title => {
  return {
    type: 'cloud service',
    metadata: {
      name: title,
      cloud: 'AWS',
      service: 'S3',
    },
    resources: [
      {
        name: 'images-138855',
        label: 'images-138855',
        id: 'images-138855',
        region: 'us-east-1',
      },
      {
        name: 'video-artifacts-138855',
        label: 'video-artifacts-138855',
        id: 'video-artifacts-138855',
        region: 'us-east-1',
      },
    ],
  };
};

const getS3Data = title => {
  return {
    type: 's3 bucket',
    metadata: {
      name: title,
      cloud: 'AWS',
      service: 'S3 Bucket',
    },
    compliance: [
      {
        title:
          'Ensure that Object-level logging for write events is enabled for S3 bucket',
        type: 'NIST',
      },
      {
        title: 'Ensure S3 Bucket Policy is set to deny HTTP requests',
        type: 'HIPAA',
      },
    ],
  };
};


export const dataStore = {
  the_internet: { type: 'the_internet', metadata: { name: 'The Internet' } },
  machine_1_1: getVMData('i-34765387'),
  machine_1_2: getVMData('i-31466271'),
  machine_1_3: getVMData('i-43689364'),
  machine_1_1_1: getVMData('i-98745698'),
  machine_1_2_1: getVMData('i-34765387'),
  machine_1_2_2: getVMData('i-895789845'),
  machine_1_2_1_1: getVMData('rds-234234996'),
  service_1_1: getServiceData('AWS S3 Buckets'),
  'images-138855': getS3Data('images-138855'),
  'video-artifacts-138855': getS3Data('video-artifacts-138855'),
};


const serviceEdgeConfig = {
  type: 'cubic-vertical',
  size: 4,
  color: serviceEdgeColor,
  style: {
    endArrow: {
      path: G6.Arrow.triangle(4, 6, 0),
      fill: serviceEdgeColor,
      stroke: serviceEdgeColor,
      fillOpacity: 0.4,
      strokeOpacity: 0.4,
      opacity: 0.4,
    },
    opacity: 0.4,
    radius: 20,
  },
};

function generateComboItems(howMany, idPrefix, comboId) {
  const items = [];
  for (let i = 1; i <= howMany; i += 1) {
    items.push({
      id: `${idPrefix}_${i}`,
      label: `test_bucket_${i}`,
      img: getNodeIcon('s3'),
      type: 'image',
      size: 30,
    });
  }
  return items;
}

export const graphData = {
  nodes: [
    {
      id: 'the_internet',
      label: 'The Internet',
      img: getNodeIcon('cloud'),
      type: 'image',
      size: 30,
    },
    {
      id: 'machine_1_1',
      label: 'i-11456332',
      // img: getNodeIcon('ec2'),
      // type: 'image',
      // size: 30,
    },
    {
      id: 'machine_1_2',
      label: 'i-31466271',
      img: getNodeIcon('computeengine'),
      type: 'image',
      size: 30,
    },
    {
      id: 'machine_1_3',
      label: 'i-43689364',
      img: getNodeIcon('ec2'),
      type: 'image',
      size: 30,
    },
    {
      id: 'service_1_1',
      label: 'test_bucket_1',
      img: getNodeIcon('s3'),
      type: 'image',
      size: 30,
      comboId: 'combo_1',
    },
    {
      id: 'service_1_2',
      label: 'test_bucket_2',
      img: getNodeIcon('s3'),
      type: 'image',
      size: 30,
    },
    ...generateComboItems(25, 'service_1', 'combo_1'),
    {
      id: 'machine_1_1_1',
      label: 'i-98745698',
      img: getNodeIcon('ec2'),
      type: 'image',
      size: 30,
    },
    {
      id: 'machine_1_2_1',
      label: 'i-34765387',
      img: getNodeIcon('computeengine'),
      type: 'image',
      size: 30,
    },
    {
      id: 'machine_1_2_2',
      label: 'i-895789845',
      img: getNodeIcon('computeengine'),
      type: 'image',
      size: 30,
    },
    {
      id: 'machine_1_2_1_1',
      label: 'rds-234234996',
      img: getNodeIcon('computeengine'),
      type: 'image',
      size: 30,
    },
  ],
  edges: [
    {
      source: 'the_internet',
      target: 'machine_1_1',
    },
    {
      source: 'the_internet',
      target: 'machine_1_2',
    },
    {
      source: 'the_internet',
      target: 'machine_1_3',
    },
    {
      source: 'the_internet',
      target: 'service_1_1',
      ...serviceEdgeConfig,
    },
    {
      source: 'the_internet',
      target: 'service_1_2',
      ...serviceEdgeConfig,
    },
    {
      source: 'the_internet',
      target: 'service_1_3',
      ...serviceEdgeConfig,
    },
    {
      source: 'machine_1_1',
      target: 'machine_1_1_1',
    },
    {
      source: 'machine_1_2',
      target: 'machine_1_2_1',
    },
    {
      source: 'machine_1_2',
      target: 'machine_1_2_2',
    },
    {
      source: 'machine_1_2_1',
      target: 'machine_1_2_1_1',
    },
    {
      source: 'machine_1_2_1_1',
      target: 'machine_1_1',
    },
  ],
}


export const computeEdgeColor = '#007fff';
export const serviceEdgeColor = '#12c4c1';
export const computeEdgeConfig = {
  type: 'cubic-vertical',
  size: 3,
  color: computeEdgeColor,
  style: {
    endArrow: {
      path: G6.Arrow.triangle(4, 6, 12),
      d: 16,
      fill: computeEdgeColor,
      stroke: computeEdgeColor,
      fillOpacity: 0.6,
      strokeOpacity: 0.6,
      opacity: 0.6,
    },
    opacity: 0.6,
    radius: 20,
  },
};
