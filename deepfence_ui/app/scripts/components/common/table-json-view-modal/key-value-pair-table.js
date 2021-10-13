/* eslint-disable */
import React from 'react';
import {isValidElement} from 'react';
import RowExpandView from './row-expand-view';

class KeyValuePairTable extends React.Component {
  constructor(props) {
    super(props);
    this.renderObjects = this.renderObjects.bind(this);
  }

  getData() {
    return this.props.data['_source'];
  }

  isValueString(value) {
    let isString = false;
    if (typeof value == 'string' || typeof value == 'number'){
      isString = true;
    } else {
      isString = false;
    }
    return isString;
  }

  getStringValueView(stringValue) {
    return (
      <div className="alert-details-value">{ stringValue }</div>
    );
  };

  getNestedValueView(data) {
    return (
      <RowExpandView data={data}></RowExpandView>
    )
  };

  renderJSX(jsx) {
    return (
      <div className="alert-details-value"> {jsx} </div>
    );
  }

  renderObjects(data) {
    let rendered;
    // check if data is a valid JSX or React Element
    if(isValidElement(data)) {
      rendered = this.renderJSX(data);
    // check id JSX is embedded inside an array
    } else if (Array.isArray(data) && data.length > 0 && isValidElement(data[0])) {
      rendered = this.renderJSX(data);
    } else {
      rendered = this.getNestedValueView(data);
    }
    return rendered;
  }

  render() {
    const data = this.getData();
    let pairs = [];
    for(var key in data){
      if (data[key]) {
        pairs.push(
          <div className="key-value-row" key={key}>
            <div className="alert-details-key">{key}</div>
            { this.isValueString(data[key]) ? this.getStringValueView(data[key]) :  this.renderObjects(data[key]) }
          </div>
        );
      }
    }

    return (
      <div className="key-value-wrapper">
        <div className="container-fluid">
        <div className="col-12 col-md-8 col-lg-10" style={{wordBreak: 'break-word'}}>
        {pairs}
        </div> 
        </div>
      </div>
    )
  }
}

export default KeyValuePairTable;
