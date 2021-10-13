// React imports
import React from 'react';
import Loader from '../../loader';

class AppLoader extends React.Component {
  render() {
    const loaderContainerStyles = {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
      height: '100%',
      minHeight: '100px'
    };
    return (
      <div style={loaderContainerStyles}>
        <Loader />
      </div>
    );
  }
}

export default AppLoader;
