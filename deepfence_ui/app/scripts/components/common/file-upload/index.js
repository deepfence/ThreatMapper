/* eslint-disable max-len */
import React from 'react';

const handleChange = handler => ({target: {files}}) => handler(files.length ? {file: files[0], name: files[0].name} : {});

export default class FileUploadField extends React.PureComponent {
  render() {
    const {
      input: {
        name,
        value,
        onChange,
        onBlur,
        ...restInput
      },
      labelBefore,
      labelInfo,
      buttonLabel = 'Browse',
      fileName,
      filenamePosition = 'after',
      meta: {
        touched,
        error,
      } = {},
      ...rest
    } = this.props;
    const showError = touched && error;
    let filenameAfter = true; // default is always after
    let filenameBefore = false;
    // only if prop is passed as 'before' we change it
    if (filenamePosition === 'before') {
      filenameBefore = true;
      filenameAfter = false;
    }
    return (
      <div className="file-upload-component form-field">
        <div
          className="heading"
         >
          {labelBefore}
          {labelInfo && (
          <span
            className="label-info fa fa-info-circle"
            title={labelInfo}
          />
          )}
        </div>
        <div className="file-upload-field-wrapper">
          <input
            id={`file-upload-field-${name}`}
            name={name}
            type="file"
            className="native-file-input"
            onChange={handleChange(onChange)}
            onBlur={handleChange(onBlur)}
            {...restInput}
            {...rest}
          />
          {filenameBefore && (
          <div title={fileName} className="filename">
            {fileName}
          </div>
          )}
          <label
            htmlFor={`file-upload-field-${name}`}
            className="file-input-label"
          >
            {buttonLabel}
          </label>
          {filenameAfter && (
          <div title={fileName} className="filename">
            {fileName}
          </div>
          )}
          {showError && (
          <div className="error-message">
            {' '}
            {error}
            {' '}
          </div>
          )}
        </div>
      </div>
    );
  }
}
