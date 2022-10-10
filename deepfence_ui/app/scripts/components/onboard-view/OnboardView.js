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
  },
  {
    name: 'Kubernetes',
    icon: kubernetes,
    type: KUBERNETES,
  },
  {
    name: 'Host',
    icon: hosting,
    type: HOST,
  },
  {
    name: 'Registry',
    icon: registry,
    type: REGISTRY,
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
  background-color: rgba(16, 16, 16, 0.8);
`;

const Infra = styled.div`
  ${CenterAlign}
`;

const Middle = styled.div`
  gap: 20px;
  display: flex;
  flex-wrap: wrap;
  width: 440px;
  justify-content: center;
`;

const Card = styled.div`
  background-color: #fefefe;
  border-radius: 4px;
  box-shadow: 0 12px 16px 0 rgb(0 0 0 / 10%);
  border-radius: 4px;
  width: 200px;
  height: 124px;
  padding: 22px 20px;
  position: relative;
  margin-top: 60px;
  display: flex;
  justify-content: center;
  &:hover {
    transform: scale(1.05);
    transition: 0.2s all ease-in-out;
  }
  cursor: pointer;
`;

const Logo = styled.div`
  background-color: #f7f7f7;
  border-radius: 92px;
  box-shadow: 0 8px 12px 0 rgb(0 0 0 / 16%);
  width: 72px;
  height: 72px;
  position: absolute;
  top: -46px;
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
  width: 136px;
  padding-bottom: 16px;
`;

const Title = styled.span`
  color: #000;
  line-height: 32px;
  padding-left: 4px;
  font-family: 'Source Sans Pro', sans-serif;
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
  padding: 6px 18px;
  border-radius: 4px;
  cursor: pointer;
  &:hover {
    background: #1b52b1;
  }
  &:focus {
    outline: none;
  }
`;

const Landing = styled.div`
  max-width: 700px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  color: #fff;
  min-height: 100vh;
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

export const OnboardPageCloud = ({ location }) => {
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
        <Cloud defaultCloud={cloudType} />
      </div>
    </>
  );
};

export const OnboardPage = ({ location }) => {
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
        {cloudType === 'host' && <HostSetup />}
        {cloudType === 'k8s' && <KubernetesSetup />}
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
        <Text>
          Deepfence Cloud is a hosted SaaS platform from which you can deploy
          multiple ThreatStryker consoles and assign users to these consoles,
          all from a single point of control. Deepfence Cloud manages console
          upgrades, scaling and security for you, so you and your teams can
          focus on the safe and secure operation of your enterprise cloud-native
          applications.
        </Text>

        <Text>
          Prior to use Deepfence Management Console, first setup/login to your
          cloud account.
        </Text>
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
                  <Bottom>
                    <ActionContainer>
                      <Title>{type.name}</Title>
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
