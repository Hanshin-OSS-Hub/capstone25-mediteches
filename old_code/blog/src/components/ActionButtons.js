import React, { useState, useRef, useEffect } from "react";
import styled from "styled-components";
import { FiSend, FiPaperclip, FiMic } from "react-icons/fi";
import { FaPills } from "react-icons/fa";

// --- Styled Components (⭐️ '$' 프롭스 수정) ---
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
  /* ⭐️ 수정: props.isSenior -> props.$isSenior */
  padding: ${(props) => (props.$isSenior ? "20px 24px" : "14px 18px")};
  font-size: ${(props) => (props.$isSenior ? "22px" : "16px")};
  border-radius: 16px;
  margin-bottom: 12px;
  /* ⭐️ 수정: props.sender -> props.$sender */
  background-color: ${(props) =>
    props.$sender === "user" ? "#A9E5D1" : "#ffffff"};
  color: ${(props) => (props.$sender === "user" ? "#0B6463" : "#083F3A")};
  border: ${(props) => (props.$sender === "bot" ? "1px solid #B6EAE1" : "none")};
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
  /* ⭐️⭐️ [수정] 너비와 높이를 고정 픽셀 값으로 지정 ⭐️⭐️ */
  width: 557px;
  height: 900px;

  /* ⭐️ [수정] 이미지가 찌그러지지 않고 영역 안에 보이도록 설정 */
  object-fit: contain;

  border-radius: 14px;
  margin-top: 8px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  align-self: ${(props) =>
    props.$sender === "user" ? "flex-end" : "flex-start"};
`;

const ComicBubbleContainer = styled.div`
  max-width: 80%;
  border-radius: 16px;
  margin-bottom: 12px;
  background-color: #ffffff;
  border: 1px solid #b6eae1;
  align-self: flex-start;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  padding: 10px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
`;

const ComicPanel = styled.img`
  width: 100%;
  height: auto;
  aspect-ratio: 1 / 1;
  border-radius: 8px;
  background-color: #f0f0f0;
`;

const InputAreaContainer = styled.div`
  display: flex;
  align-items: center;
  /* ⭐️ 수정: props.isSenior -> props.$isSenior */
  padding: ${(props) => (props.$isSenior ? "20px 22px" : "12px 18px")};
  border-top: 1px solid #d5efe8;
  background-color: #f8fffd;
`;

const StyledInput = styled.input`
  flex: 1;
  border: none;
  /* ⭐️ 수정: props.isSenior -> props.$isSenior */
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

const AttachmentButton = styled.label`
  /* ⭐️ 수정: props.isSenior -> props.$isSenior */
  font-size: ${(props) => (props.$isSenior ? "30px" : "22px")};
  cursor: pointer;
  color: #00bfa6;
  display: flex;
  align-items: center;
  padding-right: ${(props) => (props.$isSenior ? "14px" : "10px")};
  transition: color 0.2s;
  &:hover {
    color: #00a693;
  }
`;

const SendButton = styled.button`
  background: none;
  border: none;
  /* ⭐️ 수정: props.isSenior -> props.$isSenior */
  font-size: ${(props) => (props.$isSenior ? "30px" : "22px")};
  cursor: pointer;
  color: #00bfa6;
  display: flex;
  align-items: center;
  transition: color 0.2s;
  margin-left: ${(props) => (props.$isSenior ? "14px" : "8px")};
  margin-right: ${(props) => (props.$isSenior ? "0px" : "0px")};
  &:hover {
    color: #00a693;
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

const ClearImageButton = styled.button`
  background: none;
  border: none;
  color: #ff6b6b;
  font-weight: bold;
  cursor: pointer;
`;

const Spacer = styled.div`
  flex: 1;
`;

const ListeningIndicator = styled.div`
  text-align: center;
  padding: 8px 18px;
  font-size: 16px;
  color: #007a66;
  background-color: #f0fdfa;
  border-top: 1px solid #d5efe8;
  font-weight: bold;
  transition: all 0.3s ease;
`;
// --- (여기까지 Styled Components) ---

// --- API 호출 함수 (Dify/FastAPI) ---
async function callBackendAPI(userText, imageUrl) {
  const apiBase = process.env.REACT_APP_BACKEND_URL || "http://localhost:3001";

  try {
    const payload = { message: userText, image_url: imageUrl };
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

// ⭐️ [프론트 전용] 이미지 API 한 번 호출해서
//    "4컷 만화 형식의 한 장짜리 이미지" 생성
async function callGenerateComicAPI(textPrompt) {
  console.log("네컷 만화 생성 요청 (프론트 → 이미지 API):", textPrompt);

  const apiKey = "" + process.env.REACT_APP_IMAGE_API_KEY + "";
  if (!apiKey) {
    console.error("REACT_APP_IMAGE_API_KEY 가 설정되어 있지 않습니다.");
    return [];
  }

  try {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt: textPrompt,
        size: "1024x1024",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error("이미지 생성 API 오류:", response.status, errorText);
      return [];
    }

    const data = await response.json();

    if (!data || !Array.isArray(data.data)) {
      console.error("이미지 생성 API 응답 형식이 올바르지 않습니다:", data);
      return [];
    }

    const imageUrls = data.data
      .map((item) => item.url)
      .filter((url) => typeof url === "string");

    return imageUrls;
  } catch (err) {
    console.error("이미지 생성 API 통신 오류:", err);
    return [];
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
  const [isGeneratingComic, setIsGeneratingComic] = useState(false);
  const [isSeniorMode, setIsSeniorMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const chatWindowRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [messages, isBotThinking, attachedImageURL, isGeneratingComic]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachedImageBase64(reader.result);
      };
      reader.readAsDataURL(file);

      const url = URL.createObjectURL(file);
      setAttachedImageURL(url);
    }
  };

  const handleClearImage = () => {
    setAttachedImageURL(null);
    setAttachedImageBase64(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendMessage = async (textOverride = null) => {
    const dataToSend = attachedImageBase64;
    const textToSend = textOverride !== null ? textOverride : inputValue;

    if (
      isBotThinking ||
      isGeneratingComic ||
      (!textToSend.trim() && !dataToSend)
    )
      return;

    setIsBotThinking(true);

    // 1. 사용자 메시지 추가
    if (attachedImageURL) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          sender: "user",
          imageUrl: attachedImageURL,
          text: "",
        },
      ]);
    }
    if (textToSend.trim()) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          text: textToSend,
          sender: "user",
        },
      ]);
    }

    handleClearImage();
    setInputValue("");

    // 2. 텍스트 응답 받기 (Dify)
    const botReplyText = await callBackendAPI(textToSend, dataToSend);

    // 3. 텍스트 응답 추가
    setMessages((prev) => [
      ...prev,
      { id: Date.now() + 2, text: botReplyText, sender: "bot" },
    ]);
    setIsBotThinking(false);

    // ⭐️ [추가된 부분] 챗봇 응답 후, 'public/content.png' 이미지 띄우기
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now() + 3,
        sender: "bot",
        imageUrl: "/content.png", // ⭐️ public 폴더에 content.png가 있어야 합니다.
        text: "",
      },
    ]);

    // 4. 네컷 만화 생성 시작
    // ⭐️ 주석 처리 (이전 요청대로 유지)
    // setIsGeneratingComic(true);

    // 5. ⭐️ 실제 백엔드를 호출하여 만화 이미지 URL 배열 받기
    // ⭐️ 주석 처리 (이전 요청대로 유지)
    // const comicImages = await callGenerateComicAPI(comicPrompt);

    // 6. 네컷 만화 추가 (이미지가 한 장 이상 있을 경우에만)
    // ⭐️ 주석 처리 (이전 요청대로 유지)
    // if (comicImages && comicImages.length > 0) {
    //   ...
    // }
    // setIsGeneratingComic(false);
  }; // handleSendMessage 끝

  const handleVoiceInput = () => {
    if (!("webkitSpeechRecognition" in window)) {
      alert("음성 인식이 지원되지 않는 브라우저입니다.");
      return;
    }

    if (isListening || isBotThinking || isGeneratingComic) return;

    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = "ko-KR";
    let finalTranscript = "";

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      finalTranscript = text;

      if (!isSeniorMode) {
        setInputValue(text);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      if (isSeniorMode && finalTranscript.trim()) {
        handleSendMessage(finalTranscript);
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };

    recognition.start();
  };

  // --- JSX (Return) (⭐️ '$' 프롭스 수정) ---
  return (
    <ChatContainer>
      <Header>
        <LogoWrapper>
          <FaPills size={30} color="#6EE7B7" />
          <LogoText>Medi-Teches</LogoText>
        </LogoWrapper>
        <ModeToggle onClick={() => setIsSeniorMode(!isSeniorMode)}>
          {isSeniorMode ? "일반 모드로" : "고령자 모드로"}
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
                /* ⭐️ 수정: sender -> $sender, isSenior -> $isSenior */
                $sender={msg.sender}
                $isSenior={isSeniorMode}
              />
            )}
            {msg.text && (
              <MessageBubble
                /* ⭐️ 수정: sender -> $sender, isSenior -> $isSenior */
                $sender={msg.sender}
                $isSenior={isSeniorMode}
              >
                {msg.text}
              </MessageBubble>
            )}
            {/* ⭐️ 렌더링 수정: 1장만 받아도 렌더링, 4장 받으면 4개 패널로 렌더링 */}
            {msg.comicImages && msg.comicImages.length === 1 && (
              // 1장짜리 4컷 만화 (통이미지)
              <MessageImage
                src={msg.comicImages[0]}
                /* ⭐️ 수정: sender -> $sender, isSenior -> $isSenior */
                $sender={msg.sender}
                $isSenior={isSeniorMode}
              />
            )}
            {msg.comicImages && msg.comicImages.length === 4 && (
              // 4장짜리 이미지 (4개 패널)
              <ComicBubbleContainer>
                {msg.comicImages.map((imgSrc, index) => (
                  <ComicPanel
                    key={index}
                    src={imgSrc}
                    alt={`Comic Panel ${index + 1}`}
                  />
                ))}
              </ComicBubbleContainer>
            )}
          </div>
        ))}
        {isBotThinking && (
          /* ⭐️ [수정] sender -> $sender */
          <MessageBubble $sender="bot" $isSenior={isSeniorMode}>
            <em>답변 생성 중...</em>
          </MessageBubble>
        )}
        {isGeneratingComic && (
          /* ⭐️ [수정] sender -> $sender */
          <MessageBubble $sender="bot" $isSenior={isSeniorMode}>
            <em>네컷 만화 생성 중... 🎨</em>
          </MessageBubble>
        )}
      </ChatWindow>

      {attachedImageURL && (
        <ImagePreviewContainer>
          <ImagePreview src={attachedImageURL} alt="미리보기" />
          <ClearImageButton onClick={handleClearImage}>X</ClearImageButton>
        </ImagePreviewContainer>
      )}

      {isSeniorMode && isListening && (
        <ListeningIndicator>듣고 있어요... 🎤</ListeningIndicator>
      )}

      {/* ⭐️ 수정: isSenior -> $isSenior */}
      <InputAreaContainer $isSenior={isSeniorMode}>
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
        {/* ⭐️ 수정: isSenior -> $isSenior */}
        <AttachmentButton $isSenior={isSeniorMode}>
          <FiPaperclip
            onClick={() =>
              !(isBotThinking || isListening || isGeneratingComic) &&
              fileInputRef.current.click()
            }
            style={{
              cursor:
                isBotThinking || isListening || isGeneratingComic
                  ? "not-allowed"
                  : "pointer",
              color:
                isBotThinking || isListening || isGeneratingComic
                  ? "#9acac3"
                  : "#00bfa6",
            }}
          />
        </AttachmentButton>

        {isSeniorMode ? (
          // 고령자 모드
          <>
            <Spacer />
            <SendButton
              type="button"
              onClick={handleVoiceInput}
              /* ⭐️ 수정: isSenior -> $isSenior */
              $isSenior={isSeniorMode}
              disabled={isListening || isBotThinking || isGeneratingComic}
            >
              <FiMic />
            </SendButton>
            <Spacer />
          </>
        ) : (
          // 일반 모드
          <>
            <StyledInput
              placeholder="메시지를 입력하세요..."
              value={inputValue}
              /* ⭐️⭐️ [수정] e.g.target.value -> e.target.value ⭐️⭐️ */
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSendMessage(null);
                }
              }}
              disabled={isBotThinking || isGeneratingComic}
              /* ⭐️ 수정: isSenior -> $isSenior */
              $isSenior={isSeniorMode}
            />
            <SendButton
              type="button"
              onClick={() => handleSendMessage(null)}
              /* ⭐️ 수정: isSenior -> $isSenior */
              $isSenior={isSeniorMode}
              disabled={
                isBotThinking ||
                isGeneratingComic ||
                (!inputValue.trim() && !attachedImageBase64)
              }
            >
              <FiSend />
            </SendButton>
          </>
        )}
      </InputAreaContainer>
    </ChatContainer>
  );
}

export default ChatInterface;