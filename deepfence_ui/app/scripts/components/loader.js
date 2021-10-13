import React from 'react';

const smallLoaderStyle = {height: '40px', width: '40px'};
const extraSmallLoaderStyle = {height: '25px', width: '25px'};
export default class Loader extends React.Component {
  render() {
    const {small, xsmall, style} = this.props;
    let loaderSize = {};
    if (small) {
      loaderSize = smallLoaderStyle;
    }
    if (xsmall) {
      loaderSize = extraSmallLoaderStyle;
    }
    return (
      <div className="sk-circle" style={{...loaderSize, ...style}}>
        <div className="sk-circle1 sk-child" />
        <div className="sk-circle2 sk-child" />
        <div className="sk-circle3 sk-child" />
        <div className="sk-circle4 sk-child" />
        <div className="sk-circle5 sk-child" />
        <div className="sk-circle6 sk-child" />
        <div className="sk-circle7 sk-child" />
        <div className="sk-circle8 sk-child" />
        <div className="sk-circle9 sk-child" />
        <div className="sk-circle10 sk-child" />
        <div className="sk-circle11 sk-child" />
        <div className="sk-circle12 sk-child" />
      </div>
    );
  }
}
