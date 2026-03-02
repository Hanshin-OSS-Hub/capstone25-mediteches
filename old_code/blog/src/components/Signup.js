// import React, { useState } from 'react';

// function Signup({ onSwitchToLogin }) {
//   const [agreed, setAgreed] = useState(false);

//   const handleSignup = () => {
//     if (!agreed) {
//       alert("약관에 동의해주세요.");
//       return;
//     }
//     alert("회원가입 완료!");
//     onSwitchToLogin(); // 가입 후 로그인 화면으로 이동
//   };

//   return (
//     <div className="wb-content">
//       <h2 className="page-title">회원가입</h2>

//       <div className="form-group">
//         <input type="text" className="wb-input" placeholder="성명 입력" />
//         <input type="text" className="wb-input" placeholder="아이디 입력" />
//         <input type="password" className="wb-input" placeholder="비밀번호 입력" />
//         <input type="password" className="wb-input" placeholder="비밀번호 확인" />
//       </div>

//       <div className="agreement-box">
//         <input type="checkbox" id="terms" checked={agreed} onChange={(e)=>setAgreed(e.target.checked)}/>
//         <label htmlFor="terms">[필수] 서비스 이용약관 동의</label>
//       </div>

//       <div className="bottom-area">
//         <button className="btn-wb-primary" onClick={handleSignup}>회원가입</button>
//         <div className="links" onClick={onSwitchToLogin} style={{marginTop:'15px'}}>
//            이미 계정이 있으신가요? 로그인
//         </div>
//       </div>
//     </div>
//   );
// }

// export default Signup;