import React, { useState } from 'react';

// onLoginSuccess: 로그인이 성공하면 App.js에 알려주는 함수
// onSwitchToSignup: 회원가입 화면으로 전환하는 함수
function Login({ onLoginSuccess, onSwitchToSignup }) {
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');

  const handleLogin = () => {
    // 여기에 실제 로그인 로직이 들어갑니다. 지금은 무조건 성공 처리합니다.
    console.log(`로그인 시도: ${id} / ${pw}`);
    onLoginSuccess(); 
  };

  return (
    <div className="wb-content">
      <h2 className="page-title">로그인</h2>
      <div className="user-icon">👤</div>

      <div className="form-group">
        <input type="text" className="wb-input" placeholder="아이디 입력" 
          value={id} onChange={(e) => setId(e.target.value)} />
        <input type="password" className="wb-input" placeholder="비밀번호 입력" 
          value={pw} onChange={(e) => setPw(e.target.value)} />
      </div>

      <button className="btn-wb-primary" onClick={handleLogin}>로그인</button>

      <div className="links">
        <span>아이디 찾기 | 비밀번호 찾기</span>
      </div>

      <div className="bottom-area">
        <button className="btn-wb-primary" onClick={onSwitchToSignup}>회원가입 하기</button>
      </div>
    </div>
  );
}

export default Login;