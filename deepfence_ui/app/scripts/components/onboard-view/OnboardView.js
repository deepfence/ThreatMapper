import React, { useReducer, useState } from 'react';
import styled, { css } from 'styled-components';

import { useSelector } from 'react-redux';
import cloud from '../../../images/onboard/cloud.svg';
import kubernetes from '../../../images/onboard/kubernetes.svg';
import hosting from '../../../images/onboard/hosting.svg';
import registry from '../../../images/onboard/registry.svg';
import logo from '../../../images/onboard/logocloud.png';
// import { OnboardModal } from './OnboardModal';
import { Cloud, CloudModal } from './OnboardCloud';
import { HostModal, HostSetup } from './OnboardHost';
import { KubernetesModal, KubernetesSetup } from './OnboardKubernetes';
import { RegistryModal } from './OnboardRegistry';
import { getUserRole } from '../../helpers/auth-helper';
import {
  ADMIN_SIDE_NAV_MENU_COLLECTION,
  USER_SIDE_NAV_MENU_COLLECTION,
} from '../../constants/menu-collection';
import SideNavigation from '../common/side-navigation/side-navigation';
import HeaderView from '../common/header-view/header-view';

const HOST = 'host';
const KUBERNETES = 'k8s';
const CLOUD = 'cloud';
const REGISTRY = 'registry';

const SETUP_TYPES = [
  {
    name: 'Cloud',
    icon: cloud,
    type: CLOUD,
    description:
      'Connect a cloud account to check for compliance misconfigurations',
  },
  {
    name: 'Kubernetes',
    icon: kubernetes,
    type: KUBERNETES,
    description:
      'Connect a Kubernetes cluster to check for vulnerabilities, secrets & malware & compliance misconfigurations',
  },
  {
    name: 'Host',
    icon: hosting,
    type: HOST,
    description:
      'Connect a Linux Host to check for vulnerabilities, secrets, malware & compliance misconfigurations',
  },
  {
    name: 'Registry',
    icon: registry,
    type: REGISTRY,
    description:
      'Connect a registry to check images for vulnerabilities secrets & malware',
  },
];

const CenterAlign = css`
  display: flex;
  justify-content: center;
  align-items: center;
`;

const Onboard = styled.div`
  ${CenterAlign}
  flex-direction: column;
  align-items: center;
  background-color: rgba(16, 16, 16, 0.8);
`;

const Infra = styled.div`
  ${CenterAlign}
`;

const Middle = styled.div`
  gap: 20px;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  @media (min-width: 620px) {
    width: 640px;
  }
`;

const Card = styled.div`
  background-color: #222222;
  border-radius: 4px;
  box-shadow: 0 12px 16px 0 rgb(0 0 0 / 10%);
  border-radius: 4px;
  width: 300px;
  height: 180px;
  padding: 22px 20px;
  position: relative;
  margin-top: 60px;
  display: flex;
  justify-content: center;
  align-items: center;
  &:hover {
    transform: scale(1.05);
    transition: 0.2s all ease-in-out;
  }
`;

const Logo = styled.div`
  background-color: #f7f7f7;
  border-radius: 92px;
  box-shadow: 0 8px 12px 0 rgb(0 0 0 / 16%);
  width: 72px;
  height: 72px;
  position: absolute;
  top: -40px;
  padding: 4px;
`;

const Bottom = styled.div`
  display: flex;
  flex-direction: column;
  position: absolute;
  bottom: 0;
  justify-content: center;
`;

const ActionContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 300px;
`;

const Title = styled.span`
  color: #000;
  padding-left: 4px;
  font-size: 14px;
  font-family: 'Source Sans Pro', sans-serif;
`;

const Description = styled.div`
  color: #fff;
  font-size: 14px;
  font-family: 'Source Sans Pro', sans-serif;
  text-align: center;
`;

const Button = styled.button`
  all: unset;
  font-size: 15px;
  background-color: #2166da;
  border: none;
  color: #ffffff;
  font-family: 'Source Sans Pro', sans-serif;
  line-height: 20px;
  text-align: center;
  padding: 10px 0px;
  cursor: pointer;
  &:hover {
    background: #1b52b1;
  }
  &:focus {
    outline: none;
  }
`;

const Landing = styled.div`
  max-width: 800px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  color: #fff;
  min-height: 100vh;
  gap: 1.5rem;
  &:before {
    content: '';
    position: absolute;
    display: flex;
    align-items: center;
    top: 0;
    left: 0;
    height: 100%;
    width: 100%;
    transition: all 0.8s;
    opacity: 0.3;
    background: url(${logo});
    background-repeat: no-repeat;
  }
`;

const MainHeading = styled.h3`
  text-align: center;
`;

const Text = styled.h3`
  text-align: center;
  font-size: 16px;
`;

const reducer = (state, action) => {
  switch (action) {
    case HOST:
      return HOST;
    case KUBERNETES:
      return KUBERNETES;
    case CLOUD:
      return CLOUD;
    case REGISTRY:
      return REGISTRY;
    default:
      return '';
  }
};

/**
 * OnboardPageCloud is only called when user wants to look up set up instructions
 * @param {*} location is from react-router-dom
 * we send search in router to open a specific cloud type from set up instructions of posture page
 * @returns
 */

export const OnboardPageCloud = ({ location, ...rest }) => {
  const cloudType = location.state?.type;
  const sideNavMenu = () => {
    return getUserRole() === 'admin'
      ? ADMIN_SIDE_NAV_MENU_COLLECTION
      : USER_SIDE_NAV_MENU_COLLECTION;
  };
  const navs = sideNavMenu();

  const isSideNavCollapsed = useSelector(state =>
    state.get('isSideNavCollapsed')
  );

  const [activeSideNav] = useState(navs[0]);

  return (
    <>
      <SideNavigation navMenuCollection={navs} activeMenu={activeSideNav} />
      <HeaderView />
      <div
        className={`gap-header-view ${
          isSideNavCollapsed ? 'collapse-side-nav' : 'expand-side-nav'
        }`}
      >
        <Cloud defaultCloud={cloudType} {...rest} />
      </div>
    </>
  );
};

export const OnboardPage = ({ location, ...rest }) => {
  const cloudType = location?.search ? location.search.substring(1) : '';
  const sideNavMenu = () => {
    return getUserRole() === 'admin'
      ? ADMIN_SIDE_NAV_MENU_COLLECTION
      : USER_SIDE_NAV_MENU_COLLECTION;
  };
  const navs = sideNavMenu();

  const isSideNavCollapsed = useSelector(state =>
    state.get('isSideNavCollapsed')
  );

  const [activeSideNav] = useState(navs[0]);

  return (
    <>
      <SideNavigation navMenuCollection={navs} activeMenu={activeSideNav} />
      <HeaderView />
      <div
        className={`gap-header-view ${
          isSideNavCollapsed ? 'collapse-side-nav' : 'expand-side-nav'
        }`}
      >
        {cloudType === 'host' && <HostSetup {...rest} />}
        {cloudType === 'k8s' && <KubernetesSetup {...rest} />}
      </div>
    </>
  );
};

export const OnboardView = ({ match }) => {
  const [type, dispatch] = useReducer(reducer, '');

  return (
    <Onboard>
      <CloudModal
        open={type === CLOUD}
        setModal={() => dispatch('')}
        defaultCloud="aws"
      />
      <HostModal open={type === HOST} setModal={() => dispatch('')} />
      <KubernetesModal
        open={type === KUBERNETES}
        setModal={() => dispatch('')}
      />
      <RegistryModal
        open={type === REGISTRY}
        setModal={() => dispatch('')}
        match={match}
      />

      <Landing>
        <MainHeading>Welcome to Deepfence Console</MainHeading>
        <Infra>
          <Middle>
            {SETUP_TYPES.map(type => {
              return (
                <Card key={type.name}>
                  <Logo>
                    <img
                      className="img-fluid p-1"
                      src={type.icon}
                      alt={type.name}
                      width="78"
                      height="78"
                    />
                  </Logo>
                  <Description>{type.description}</Description>
                  <Bottom>
                    <ActionContainer>
                      <Button
                        type="button"
                        onClick={() => {
                          dispatch(type.type);
                        }}
                      >
                        Connect
                      </Button>
                    </ActionContainer>
                  </Bottom>
                </Card>
              );
            })}
          </Middle>
        </Infra>
      </Landing>
    </Onboard>
  );
};
