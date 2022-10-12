import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';

const Wrapper = styled.div`
  background-color: transparent;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
`;
const Text = styled.div`
  font-size: 16px;
  border: none;
  color: #ffffff;
  font-family: 'Source Sans Pro', sans-serif;
  line-height: 20px;
  text-align: center;
  &:focus {
    outline: none;
  }
  padding: 8px 14px;
  border-radius: 4px;
  margin-top: 35%;
  
`;

const U = styled.u`
  padding-bottom: 1px;
  text-decoration: none;
  border-bottom: 0.5px solid #0080ff;
  cursor: pointer;
  &:hover {
    color: #3399ff;
    border-bottom: 0.5px solid #0080ff;
  }
  & a {
    text-decoration: none;
    display: inline;
    padding: 0;
    margin: 0;
    font-size: 16px;
    cursor: pointer;
    color: #0080ff;
    &:hover {
      color: #3399ff;
    }
  }
`;

export const isConnected = false;
const Information = [
  {
    page: 'topology',
    component: (
      <Text>
        Connect a&nbsp;
        <U>
          <Link to="/onboard/cloud-agent/?host">Linux host&nbsp;</Link>
        </U>
        OR&nbsp;
        <U>
          <Link to="/onboard/cloud-agent/?k8s">Kubernetes cluster&nbsp;</Link>
        </U>
        to check for vulnerabilities, secrets & malware &
        compliance misconfigurations.
      </Text>
    ),
  },
  {
    page: 'attack-graph',
    component: (
    <Text>
        Connect to&nbsp;
        <U>
        <Link to={{
            pathname: '/onboard',
            state: {
            from: 'attack-graph',
            }
        }}>Deepfence Agent&nbsp;</Link>
        </U>
        to check for vulnerabilities compliance
        misconfigurations.
    </Text>
    ),
  },
  {
    page: 'vulnerabilities',
    component: (
      <Text>
        Connect to&nbsp;
        <U>
        <Link to={{
            pathname: '/onboard',
            state: {
              from: 'vulnerabilities',
            }
          }}>Deepfence Agent&nbsp;</Link>
        </U>
        to check for vulnerabilities compliance
        misconfigurations.
      </Text>
    ),
  },
  {
    page: 'secrets',
    component: (
      <Text>
        Connect to&nbsp;
        <U>
          <Link to={{
            pathname: '/onboard',
            state: {
              from: 'secrets',
            }
          }}>Deepfence Agent&nbsp;</Link>
        </U>
        to check for secrets compliance misconfigurations.
      </Text>
    ),
  },
];
export const ConnectAgent = props => {
  const { page } = props;
  return (
    <Wrapper>{Information.find(ele => ele.page === page)?.component}</Wrapper>
  );
};
