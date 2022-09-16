/* eslint-disable react/button-has-type */
import React, { useState } from 'react';

import { downloadApiEndPoint } from '../../../utils/web-api-utils';

export const DbFileUploader = () => {
  const [selectedFile, setSelectedFile] = useState();
  const [isFilePicked, setIsFilePicked] = useState(false);

  const changeHandler = event => {

    setSelectedFile(event.target.files[0]);
    setIsFilePicked(true);
  };
  const handleSubmission = () => {
    const url = `${downloadApiEndPoint()}/upload-vulnerability-db`;
    const formData = new FormData();

    formData.append('file', selectedFile);
    fetch(url, {
      method: 'POST',
      headers: {
        'deepfence-key': localStorage.getItem('dfApiKey'),
      },
      body: formData,
    })
      .then(response => response.json())
      .then(result => {
        console.log('Success:', result);
      })
      .catch(error => {
        console.error('Error:', error);
      });
  };

  return (
    <div>
       <h4> Upload Vulnerabilty Database</h4>
       <div style={{marginTop: '30px'}}>
       <input type="file" name="file" onChange={changeHandler} />
      {isFilePicked ? (
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
        <p style={{paddingTop: "10px"}}>Select a file to show details</p>
      )}{' '}
       </div>
      <div >
        <button className="btn-download" onClick={handleSubmission}>Upload</button>
      </div>
    </div>
  );
};
