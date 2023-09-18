'use strict';

const { useEffect, useState } = require("react");
const ReactDOM = require('react-dom');

let { remote, ipcRenderer } = require('electron');
const { shell } = remote;

const languagePack = require("electron").remote.getGlobal("sharedObj").language;


//#region Title Component
const Title = (props) => {
  return (
    <div className="title">
      <span className="part1">Reh@</span>
      <span className="part2">St<img className="brain_img" src="../dependencies/img/brain.svg" />re</span>
    </div>
  );
}

//#endregion

//#region Login Component
const LoginForm = (props) => {
  const [userinfo, setUserinfo] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    ipcRenderer.on('account-manager-login-channel', (event, arg) => {
      setUserinfo(arg);
    })
    return () => {
      ipcRenderer.removeAllListeners('account-manager-login-channel');
    };
  })

  const submitButtonClick = (e) => {
    e.preventDefault();
    ipcRenderer.send('account-manager-login-channel', JSON.stringify({
      username: username,
      password: password
    }));
  }

  const forgotPasswordClick = () => {
    ipcRenderer.send('account-manager-open-account-forgot-password-page', '');
  }

  const registerClick = () => {
    ipcRenderer.send('account-manager-open-account-registration-page', '');
  }

  const onUsernameChange = (e) => {
    setUsername(e.target.value);
  }

  const onPasswordChange = (e) => {
    setPassword(e.target.value);
  }

  return (
    <form className="loginForm">
      <input type="text" placeholder={languagePack.username} onChange={onUsernameChange} />
      <input type="password" placeholder={languagePack.password} onChange={onPasswordChange} />
      <p className="loginStatus">{userinfo}</p>
      <button type="submit" onClick={submitButtonClick}>{languagePack.loginButton}</button>
      <br />
      <p className="forgotPassword">
        <a className="forgotPasswordLink" href="#" onClick={forgotPasswordClick}>{languagePack.reset_my_password}</a>
      </p>
      <p className="registerText">
        {languagePack.noAccount}? <a className="registerLink" href="#" onClick={registerClick}>{languagePack.createNewAccount}</a>
      </p>
    </form>
  );
}

//#endregion

//#region Container Component
const Container = (props) => {
  return (
    <div className="container">
      <Title />
      <LoginForm />
    </div>
  );
}

//#endregion


//Render Component
ReactDOM.render(
  <Container />,
  document.getElementById('root')
);