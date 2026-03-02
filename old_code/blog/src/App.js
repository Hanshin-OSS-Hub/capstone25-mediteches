import React, { useState } from "react";
import styled from "styled-components";
import "./App.css";

// ChatInterface 임포트 (경로 주의!)
import ChatInterface from "./components/ChatInterface";

const AppContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 20px;
  background-color: #f8f9fa;
`;

const Logo = styled.h1`
  font-size: 48px;
  color: #1a0dab;
  margin-bottom: 10px;
`;

const Subtitle = styled.p`
  font-size: 16px;
  color: #5f6368;
  margin-bottom: 20px;
`;

function App() {
  const [step, setStep] = useState("entry");
  const [guestInfo, setGuestInfo] = useState({ name: "", phone: "" });
  const [agreed, setAgreed] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setGuestInfo((prev) => ({ ...prev, [name]: value }));
  };

  const handleGuestLogin = async () => {
    if (!guestInfo.name || !guestInfo.phone) {
      alert("이름과 연락처를 모두 입력해주세요.");
      return;
    }
    if (!agreed) {
      alert("개인정보 제공 동의가 필요합니다.");
      return;
    }

    try {
      // 백엔드 통신
      const response = await fetch("http://localhost:3001/guest/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agreed: true,
          name: guestInfo.name,
          phone: guestInfo.phone,
        }),
      });

      if (!response.ok) {
        throw new Error("로그인 실패");
      }

      const data = await response.json();
      localStorage.setItem("user_id", data.user_id);
      console.log("로그인 성공! ID:", data.user_id);

      setStep("main");
    } catch (error) {
      console.error("로그인 에러:", error);
      alert("서버와 연결할 수 없습니다. (백엔드를 켜셨나요?)");
    }
  };

  if (step === "main") {
    return (
      <AppContainer>
        <Logo>Medi-Teches</Logo>
        <Subtitle>우리 일상 속 건강 ai - {guestInfo.name}님</Subtitle>
        <ChatInterface />
      </AppContainer>
    );
  }

  return (
    <div className="app-container">
      <div className="mobile-view">
        <div className="wb-header">
          <span style={{ fontStyle: "italic", fontSize: "20px" }}>
            Medi
            <br />
            Teches
          </span>
          <span
            className="close-btn"
            onClick={() => setStep("entry")}
            style={{ cursor: "pointer" }}
          >
            X
          </span>
        </div>

        <div className="wb-content">
          {step === "entry" && (
            <>
              <h2 className="page-title">로그인</h2>
              <div
                className="user-icon"
                style={{ fontSize: "60px", margin: "20px 0" }}
              >
                👤
              </div>
              <div
                className="bottom-area"
                style={{ marginTop: "auto", width: "100%" }}
              >
                <button
                  className="btn-wb-primary"
                  onClick={() => setStep("guestForm")}
                >
                  게스트로 로그인
                </button>
                <div
                  className="links"
                  style={{ marginTop: "10px", textAlign: "center" }}
                >
                  <span style={{ color: "#aaa" }}>일반 로그인 (준비중)</span>
                </div>
              </div>
            </>
          )}

          {step === "guestForm" && (
            <>
              <h2 className="page-title">정보 동의</h2>
              <div
                className="form-group"
                style={{ width: "100%", marginBottom: "15px" }}
              >
                <input
                  type="text"
                  name="name"
                  className="wb-input"
                  placeholder="이름 입력"
                  value={guestInfo.name}
                  onChange={handleInputChange}
                  style={{
                    width: "100%",
                    padding: "10px",
                    marginBottom: "8px",
                    borderRadius: "8px",
                    border: "1px solid #ddd",
                  }}
                />
                <input
                  type="text"
                  name="phone"
                  className="wb-input"
                  placeholder="연락처 입력"
                  value={guestInfo.phone}
                  onChange={handleInputChange}
                  style={{
                    width: "100%",
                    padding: "10px",
                    marginBottom: "8px",
                    borderRadius: "8px",
                    border: "1px solid #ddd",
                  }}
                />
              </div>

              <div
                className="agreement-box"
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "8px",
                }}
              >
                <input
                  type="checkbox"
                  id="infoAgree"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  style={{ marginTop: "4px" }}
                />
                <label
                  htmlFor="infoAgree"
                  style={{ fontSize: "14px", lineHeight: "1.4" }}
                >
                  [필수] 개인정보(이름, 연락처) 제공 및<br />
                  서비스 이용에 동의합니다.
                </label>
              </div>

              <div
                className="bottom-area"
                style={{ marginTop: "auto", width: "100%" }}
              >
                <button className="btn-wb-primary" onClick={handleGuestLogin}>
                  입장하기
                </button>
                <div
                  className="links"
                  onClick={() => setStep("entry")}
                  style={{
                    marginTop: "15px",
                    textAlign: "center",
                    cursor: "pointer",
                    color: "#666",
                  }}
                >
                  뒤로 가기
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
