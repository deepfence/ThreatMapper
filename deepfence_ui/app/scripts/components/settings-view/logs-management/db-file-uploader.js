import React, { useState } from 'react';
import HorizontalLoader from '../../common/app-loader/horizontal-dots-loader';

import { downloadApiEndPoint } from '../../../utils/web-api-utils';

export const DbFileUploader = () => {
  const [selectedFile, setSelectedFile] = useState();
  const [isUploading, setIsUploading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState(null);

  const changeHandler = event => {
    if (event.target.files?.[0]) {
      setSelectedFile(event.target.files[0]);
    }
  };
  const handleSubmission = () => {
    if (!selectedFile?.name?.toLowerCase?.().endsWith?.('.tar.gz')) {
      setError('Invalid file type, only tar.gz file is allowed');
      return;
    }

    const url = `${downloadApiEndPoint()}/upload-vulnerability-db`;
    const formData = new FormData();

    formData.append('file', selectedFile);
    setIsUploading(true);
    setIsSuccess(false);
    setError(null);
    fetch(url, {
      method: 'POST',
      headers: {
        'deepfence-key': localStorage.getItem('dfApiKey'),
      },
      body: formData,
    })
      .then(result => {
        if (result.status >= 200 && result.status < 300) {
          setIsSuccess(true);
          setSelectedFile(undefined);
        } else {
          throw new Error('non ok status code from api');
        }
      })
      .catch(error => {
        setError(
          'Error uploading the file, please check if the file is valid.'
        );
        console.error('Error:', error);
      })
      .finally(() => {
        setIsUploading(false);
      });
  };

  return (
    <div>
      <h4> Upload Vulnerabilty Database</h4>
      <div style={{ marginTop: '30px' }}>
        <input type="file" name="file" onChange={changeHandler} />
        {selectedFile ? (
          <div>
            <p>Filename: {selectedFile.name}</p>
            <p>Filetype: {selectedFile.type}</p>
            <p>Size in bytes: {selectedFile.size}</p>
            <p>
              lastModifiedDate:{' '}
              {selectedFile.lastModifiedDate.toLocaleDateString()}
            </p>
          </div>
        ) : (
          <p style={{ paddingTop: '10px' }}>Please select a file to upload</p>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button
          className="btn-download"
          type="button"
          onClick={handleSubmission}
          disabled={isUploading}
        >
          Upload
        </button>
        {isUploading ? (
          <span>
            <HorizontalLoader style={{ position: 'static' }} />
          </span>
        ) : null}
      </div>
      {error ? <div style={{ color: 'red' }}>{error}</div> : null}
      {isSuccess ? (
        <div style={{ color: 'green' }}>
          Vulnerability db updated successfully
        </div>
      ) : null}
    </div>
  );
};
