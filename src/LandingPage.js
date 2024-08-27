import React, { useEffect } from 'react';
import { gapi } from 'gapi-script';
import './LandingPage.css';

const FILE_NAME = 'MetroMapData.json';
const CLIENT_ID = process.env.REACT_APP_CLIENT_ID;
const API_KEY = process.env.REACT_APP_API_KEY;
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

const LandingPage = ({ onLoginSuccess }) => {
  useEffect(() => {
    const initClient = () => {
      gapi.client.init({
        apiKey: API_KEY,
        clientId: CLIENT_ID,
        scope: SCOPES,
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
      }).then(() => {
        gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);
        updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
      });
    };
    gapi.load('client:auth2', initClient);
  }, []);

  const updateSigninStatus = (isSignedIn) => {
    if (isSignedIn) {
      onLoginSuccess();
    }
  };

  const handleLogin = () => {
    gapi.auth2.getAuthInstance().signIn();
  };

  return (
    <div className="landing-page">
      <h1 className="landing-title">Welcome to MetroMap</h1>
      <button className="signin-button" onClick={handleLogin}>
        Sign in with Google Drive
      </button>
    </div>
  );
};

export default LandingPage;
