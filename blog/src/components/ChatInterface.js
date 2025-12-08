import React, { useState, useRef, useEffect } from "react";
import styled from "styled-components";
// 🚨 만화 생성 버튼(FiImage)은 더 이상 필요 없으므로 제거했습니다.
import { FiSend, FiPaperclip, FiMic, FiX } from "react-icons/fi";
import { FaPills } from "react-icons/fa";

// .env 파일에서 REACT_APP_OPENAI_API_KEY를 가져옵니다.
const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;

// --- 4컷 만화 생성용 프롬프트 ---
const COMIC_PROMPT_SYSTEM = `
[ System ]
당신은 그림을 그리는 화가 입니다.
약 복용 및 폐기 안내를 주제로 한 4컷 만화를 생성합니다.
글자는 이미지에 생성되어 있지 않아야 합니다.
시드번호는 20251030을 사용 하십시오.
`;

const COMIC_PROMPT_CONTENT = `
[ Content ]
1. 3D Lowpoly 스타일로 4컷 만화를 그려주십시오.
2. 2등신 캐릭터 스타일로 그려주십시오.
3. 배경은 단색 혹은 그라데이션으로 심플하게 처리하십시오.
4. 만화의 내용은 약 복용 전 확인부터 올바른 폐기까지의 과정을 보여주는 스토리입니다.
- 1컷: 약 봉투와 약이 식탁 위에 놓여 있고, 사람이 약을 바라보는 장면 
- 2컷: 사람이 스마트폰 화면을 보며 약의 복용 방법을 확인하는 장면. 
- 3컷: 사람이 물과 함께 약을 복용하는 장면.
- 4컷: 남은 약 봉투를 폐기물 통에 버리는 장면 
5. 그림의 색감은 밝고 경쾌하게 그려주십시오.
6. 오브젝트는 각 컷당 1~3개만 사용하고, 핵심 주제를 명확하게 표현하십시오.
7. 만화의 구도는 전경, 중경, 배경을 활용하여 깊이감을 부여하고, 컷마다 다양한 시점을 활용하여 스토리의 리듬을 살리십시오.
8. 만화에 등장하는 캐릭터의 표정 및 행동을 극적으로 표현하여 메시지를 강조하십시오.
9. 가능하면 기존의 밈이나 대중적인 비유를 활용하여 만화를 재미있게 표현하십시오.
10. 규정에 어긋나거나, 특정 사회적 인물/직위에 대한 그림, 폭력적 혹은 성적인 그림을 그려서는 안 됩니다.

[ Goal ]
사용자가 약 복용 전 확인부터 올바른 폐기까지의 과정을 재미있고 교육적으로 이해할 수 있도록 그림을 그리십시오.
`;

// --- Styled Components (기존 유지) ---
const ChatContainer = styled.div`
  width: 100%;
  max-width: 620px;
  height: 75vh;
  border-radius: 18px;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #e9fbf7 0%, #ffffff 100%);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  margin: 0 auto;
`;

const Header = styled.div`
  text-align: center;
  padding: 16px 24px;
  background-color: #f8fffd;
  border-bottom: 1px solid #d5efe8;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;
const LogoWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;
const LogoText = styled.h1`
  font-size: 28px;
  font-weight: 700;
  color: #6ee7b7;
  font-family: "Poppins", sans-serif;
  margin: 0;
  display: flex;
  align-items: center;
`;
const ModeToggle = styled.button`
  border: none;
  background: #d8fff0;
  color: #007a66;
  font-size: 14px;
  font-weight: bold;
  padding: 8px 14px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  &:hover {
    background: #c0f4e1;
  }
`;
const ChatWindow = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
`;
const MessageBubble = styled.div`
  max-width: 80%;
  padding: ${(props) => (props.$isSenior ? "20px 24px" : "14px 18px")};
  font-size: ${(props) => (props.$isSenior ? "22px" : "16px")};
  border-radius: 16px;
  margin-bottom: 12px;
  background-color: ${(props) =>
    props.$sender === "user" ? "#A9E5D1" : "#ffffff"};
  color: ${(props) => (props.$sender === "user" ? "#0B6463" : "#083F3A")};
  border: ${(props) =>
    props.$sender === "bot" ? "1px solid #B6EAE1" : "none"};
  align-self: ${(props) =>
    props.$sender === "user" ? "flex-end" : "flex-start"};
  box-shadow: ${(props) =>
    props.$sender === "bot"
      ? "0 2px 6px rgba(0,0,0,0.05)"
      : "0 2px 6px rgba(0,0,0,0.08)"};
  white-space: pre-wrap;
  transition: all 0.3s ease;
`;
const MessageImage = styled.img`
  width: 100%;
  max-width: 500px;
  height: auto;
  object-fit: contain;
  border-radius: 14px;
  margin-top: 8px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  align-self: ${(props) =>
    props.$sender === "user" ? "flex-end" : "flex-start"};
`;
const InputAreaContainer = styled.div`
  display: flex;
  align-items: center;
  padding: ${(props) => (props.$isSenior ? "20px 22px" : "12px 18px")};
  border-top: 1px solid #d5efe8;
  background-color: #f8fffd;
`;
const StyledInput = styled.input`
  flex: 1;
  border: none;
  padding: ${(props) => (props.$isSenior ? "16px" : "12px")};
  font-size: ${(props) => (props.$isSenior ? "20px" : "16px")};
  color: #0b6463;
  background: transparent;
  &::placeholder {
    color: #9acac3;
  }
  &:focus {
    outline: none;
  }
`;
const IconButton = styled.button`
  background: none;
  border: none;
  font-size: ${(props) => (props.$isSenior ? "30px" : "22px")};
  cursor: pointer;
  color: ${(props) => props.$color || "#00bfa6"};
  display: flex;
  align-items: center;
  padding: 0 8px;
  transition: color 0.2s;

  &:hover {
    color: ${(props) => props.$hoverColor || "#00a693"};
  }
  &:disabled {
    color: #9acac3;
    cursor: not-allowed;
  }
`;
const ImagePreviewContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 18px;
  border-top: 1px solid #d5efe8;
  background-color: #f8fffd;
`;
const ImagePreview = styled.img`
  max-width: 120px;
  border-radius: 10px;
  border: 1px solid #c4ebe2;
`;
const ListeningIndicator = styled.div`
  text-align: center;
  padding: 8px 18px;
  font-size: 16px;
  color: #007a66;
  background-color: #f0fdfa;
  border-top: 1px solid #d5efe8;
  font-weight: bold;
`;

// 1. API 호출 함수
async function callBackendAPI(userText, imageUrl) {
  const apiBase = process.env.REACT_APP_BACKEND_URL || "http://localhost:3001";

  // ⭐ [핵심] 아까 로그인할 때 저장해둔 ID 꺼내기
  const storedUserId = localStorage.getItem("user_id");

  try {
    const payload = {
      message: userText,
      image_url: imageUrl,
      user_id: storedUserId, // ⭐ [핵심] 백엔드로 ID 같이 보내기!
    };

    const response = await fetch(`${apiBase}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return "서버 응답 오류가 발생했습니다.";
    }

    const data = await response.json();
    return data.reply || "AI의 응답을 받을 수 없습니다.";
  } catch (err) {
    console.error("백엔드 통신 오류:", err);
    return "백엔드 서버와 연결할 수 없습니다.";
  }
}

// --- 2. OpenAI 이미지 생성 API 호출 ---
async function callOpenAI_ImageAPI(systemPrompt, contentPrompt) {
  if (!OPENAI_API_KEY) {
    console.warn("OpenAI API 키가 설정되지 않았습니다.");
    return null;
  }

  try {
    const finalPrompt = `${systemPrompt}\n\n${contentPrompt}`;

    const response = await fetch(
      "https://api.openai.com/v1/images/generations",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "dall-e-3",
          prompt: finalPrompt,
          n: 1,
          size: "1024x1024",
          quality: "standard",
          style: "vivid",
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("OpenAI API Error:", errorData);
      return null;
    }

    const data = await response.json();
    return data.data[0].url;
  } catch (error) {
    console.error("이미지 생성 실패:", error);
    return null;
  }
}

// --- Main Component ---
function ChatInterface() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "안녕하세요! 복용할 약 사진과 추가 정보를 알려주세요.",
      sender: "bot",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [attachedImageBase64, setAttachedImageBase64] = useState(null);
  const [attachedImageURL, setAttachedImageURL] = useState(null);
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [isSeniorMode, setIsSeniorMode] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const chatWindowRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [messages, isBotThinking]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => setAttachedImageBase64(reader.result);
      reader.readAsDataURL(file);
      setAttachedImageURL(URL.createObjectURL(file));
    }
  };

  const handleClearImage = () => {
    setAttachedImageURL(null);
    setAttachedImageBase64(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // --- 메시지 전송 및 자동 이미지 생성 핸들러 ---
  // --- ChatInterface.js 내부 ---

  const handleSendMessage = async (textOverride = null) => {
    const textToSend = textOverride !== null ? textOverride : inputValue;
    const imageToSend = attachedImageBase64;

    if (isBotThinking || (!textToSend.trim() && !imageToSend)) return;

    // 1. 상태 초기화 및 사용자 메시지 표시
    setIsBotThinking(true);

    if (attachedImageURL) {
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), sender: "user", imageUrl: attachedImageURL },
      ]);
    }
    if (textToSend.trim()) {
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, sender: "user", text: textToSend },
      ]);
    }

    handleClearImage();
    setInputValue("");

    // 2. [Step A] 텍스트 챗봇 응답 받기
    const botReply = await callBackendAPI(textToSend, imageToSend);
    setMessages((prev) => [
      ...prev,
      { id: Date.now() + 2, sender: "bot", text: botReply },
    ]);

    // 3. [Step B] 이미지 생성 시도
    if (OPENAI_API_KEY) {
      console.log("🚀 이미지 생성 시작!"); // 이 로그가 떠야 정상

      const generatedImageUrl = await callOpenAI_ImageAPI(
        COMIC_PROMPT_SYSTEM,
        COMIC_PROMPT_CONTENT
      );

      if (generatedImageUrl) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 3,
            sender: "bot",
            imageUrl: generatedImageUrl,
          },
        ]);
      } else {
        console.error("❌ 이미지 생성 실패 (API 호출 후 URL 못 받음)");
      }
    } else {
      // 🚨 키가 없을 때 실행되는 부분 (아까 이 부분이 없어서 조용했던 것!)
      console.error("❌ OPENAI_API_KEY가 없습니다. .env 파일을 확인하세요.");
      alert("API 키가 인식되지 않았습니다. 콘솔을 확인해주세요.");
    }

    setIsBotThinking(false);
  };

  const handleVoiceInput = () => {
    if (!("webkitSpeechRecognition" in window)) {
      alert("이 브라우저는 음성 인식을 지원하지 않습니다.");
      return;
    }
    if (isListening || isBotThinking) return;

    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = "ko-KR";
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (e) => {
      const text = e.results[0][0].transcript;
      if (!isSeniorMode) setInputValue(text);
      else if (text.trim()) handleSendMessage(text);
    };
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  return (
    <ChatContainer>
      <Header>
        <LogoWrapper>
          <FaPills size={30} color="#6EE7B7" />
          <LogoText>Medi-Teches</LogoText>
        </LogoWrapper>
        <ModeToggle onClick={() => setIsSeniorMode(!isSeniorMode)}>
          {isSeniorMode ? "일반 모드" : "고령자 모드"}
        </ModeToggle>
      </Header>

      <ChatWindow ref={chatWindowRef}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{ display: "flex", flexDirection: "column" }}
          >
            {msg.imageUrl && (
              <MessageImage
                src={msg.imageUrl}
                $sender={msg.sender}
                alt="Chat Attachment"
              />
            )}
            {msg.text && (
              <MessageBubble $sender={msg.sender} $isSenior={isSeniorMode}>
                {msg.text}
              </MessageBubble>
            )}
          </div>
        ))}
        {isBotThinking && (
          <MessageBubble $sender="bot" $isSenior={isSeniorMode}>
            <em>
              답변과 만화를 그리는 중입니다...
              <span className="animate-pulse">...</span>
            </em>
          </MessageBubble>
        )}
      </ChatWindow>

      {attachedImageURL && (
        <ImagePreviewContainer>
          <ImagePreview src={attachedImageURL} alt="Preview" />
          <IconButton onClick={handleClearImage} $color="#ff6b6b">
            <FiX />
          </IconButton>
        </ImagePreviewContainer>
      )}

      {isSeniorMode && isListening && (
        <ListeningIndicator>듣고 있어요... 🎤</ListeningIndicator>
      )}

      <InputAreaContainer $isSenior={isSeniorMode}>
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: "none" }}
        />

        {/* 파일 첨부 버튼 */}
        <IconButton
          $isSenior={isSeniorMode}
          onClick={() => !isBotThinking && fileInputRef.current.click()}
          disabled={isBotThinking}
        >
          <FiPaperclip />
        </IconButton>

        {/* 🚨 [삭제됨] 만화 생성 버튼(FiImage) 삭제 */}

        {isSeniorMode ? (
          <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
            <IconButton
              $isSenior={isSeniorMode}
              onClick={handleVoiceInput}
              disabled={isListening || isBotThinking}
            >
              <FiMic />
            </IconButton>
          </div>
        ) : (
          <>
            <StyledInput
              placeholder="메시지를 입력하세요..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              disabled={isBotThinking}
              $isSenior={isSeniorMode}
            />
            <IconButton
              $isSenior={isSeniorMode}
              onClick={() => handleSendMessage()}
              disabled={
                isBotThinking || (!inputValue.trim() && !attachedImageBase64)
              }
            >
              <FiSend />
            </IconButton>
          </>
        )}
      </InputAreaContainer>
    </ChatContainer>
  );
}

export default ChatInterface;
