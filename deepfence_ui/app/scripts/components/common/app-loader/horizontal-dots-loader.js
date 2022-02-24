import styled, {keyframes} from 'styled-components';
import React from 'react';

// Credits: https://github.com/amandeepmittal/react-animated-dots
const blink = keyframes`
  50% {color: transparent;}
`;

const Dot = styled.span`
  animation: 1s ${blink} infinite;
  &:nth-child(1) {
    animation-delay: 0ms;
  }
  &:nth-child(2) {
    animation-delay: 250ms;
  }
  &:nth-child(3) {
    animation-delay: 500ms;
  }
`;

export default class HorizontalLoader extends React.PureComponent {
  render() {
    const {style} = this.props;
    const spanStyle = {
      top: '50%',
      left: '50%',
      position: 'absolute',
      fontSize: '2.5rem',
      ...style
    };
    return (
      <span className="active-color" style={spanStyle}>
        <Dot>&middot;</Dot>
        <Dot>&middot;</Dot>
        <Dot>&middot;</Dot>
      </span>
    );
  }
}
