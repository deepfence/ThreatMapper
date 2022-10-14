import React, { useEffect, useReducer, useState } from 'react';
import styled, { css } from 'styled-components';

import { useDispatch, useSelector } from 'react-redux';
import Tippy from '@tippyjs/react';
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
import { getConnectedAgent } from '../../actions';

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
  height: 100vh;
  & > img:first-child {
    position: absolute;
    display: flex;
    align-items: center;
    top: 0;
    left: 0;
    transition: all 0.8s;
    opacity: 0.8;
    z-index: -1;
  }
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
  height: 190px;
  padding: 22px 20px;
  position: relative;
  margin-top: 60px;
  display: flex;
  flex-direction: column;
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

const Description = styled.div`
  color: #fff;
  font-size: 14px;
  font-family: 'Source Sans Pro', sans-serif;
  text-align: center;
  padding-bottom: 1em;
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

const GoToDashboardButton = styled.button`
  all: unset;
  font-size: 15px;
  background-color: #222222;
  border-radius: 4px;
  margin: 0 10px;
  color: #f2f2f2;
  font-family: 'Source Sans Pro', sans-serif;
  line-height: 20px;
  text-align: center;
  padding: 10px 0px;
  cursor: pointer;
  &:hover {
    background: #1a1a1a;
    color: #fff;
  }
  &:focus {
    outline: none;
  }
  ${({ disabled }) =>
    disabled &&
    `
    color: #737373;
    cursor: auto;
    &:hover {
      background: #222222;
      color: #737373;
    }
  `}
`;

const Landing = styled.div`
  max-width: 800px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  color: #fff;
  gap: 1.5rem;
`;

const MainHeading = styled.h3`
  text-align: center;
  margin: 0;
`;

const Connected = styled.div`
  font-size: 12px;
  padding: 4px 8px;
  color: #a4a2a2;
`;

const Ul = styled.ul`
  padding: 0px 10px;
  margin: 0;
  font-size: 12px;
  & ul {
    padding: 0;
  }
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
        {cloudType === 'host' && <HostSetup {...rest} />}
        {cloudType === 'k8s' && <KubernetesSetup {...rest} />}
      </div>
    </>
  );
};

const ConnectedPopup = props => {
  return <div>Hello</div>;
};

export const OnboardView = ({ match, ...rest }) => {
  const [type, dispatch] = useReducer(reducer, '');
  const apiDispatch = useDispatch();
  const heading = rest.history.location.state?.from ? 'Connect' : 'Welcome';
  // onboard api check user has atleast connect deepfence console
  const agent = useSelector(state => state.getIn(['agentConnection', 'data']));


  useEffect(() => {
    setInterval(() => {
      // apiDispatch(getConnectedAgent());
    }, 3000);
    // trigger onboard api after login or every refresh of token or page
  }, []);
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
        {...rest}
      />
      <img src={logo} alt="logo" />
      <Landing>
        <MainHeading>{heading} to Deepfence Console</MainHeading>
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
                    <Tippy
                      hideOnClick
                      interactive
                      content={
                        agent?.[type.type]?.length > 0 ? (
                          <div>
                            {agent[type?.type]?.map(c => {
                              return (
                                <Ul key={c}>
                                  <li>{c}</li>
                                </Ul>
                              );
                            })}
                          </div>
                        ) : (
                          <span
                            style={{
                              fontSize: '12px',
                            }}
                          >
                            0 connected
                          </span>
                        )
                      }
                      placement="top-start"
                      trigger="mouseenter"
                    >
                      <Connected>
                        {agent?.[type?.type]?.length ?? 0} connected
                      </Connected>
                    </Tippy>

                    <ActionContainer>
                      <Button
                        type="button"
                        onClick={() => {
                          dispatch(type.type);
                        }}
                      >
                        Connect {type.connected ? 'More' : ''}
                      </Button>
                    </ActionContainer>
                  </Bottom>
                </Card>
              );
            })}
          </Middle>
        </Infra>
        <GoToDashboardButton
          onClick={() => {
            rest.history.push('/topology');
          }}
          disabled={!agent?.connected}
        >
          Go To Application Dashboard
        </GoToDashboardButton>
      </Landing>
    </Onboard>
  );
};

// export const OnboardView = ConnectAgent;
