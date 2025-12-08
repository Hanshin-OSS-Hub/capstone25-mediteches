from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import requests
import os
from dotenv import load_dotenv
import uvicorn
import base64
import uuid
import datetime
from pydantic import BaseModel

# --- [Firebase 라이브러리] ---
import firebase_admin
from firebase_admin import credentials, firestore

# .env 파일 로드
load_dotenv()

# --- [Firebase 초기화] ---
# 키 파일 이름(firebase_key.json)이 폴더에 있는지 꼭 확인하세요!
if not firebase_admin._apps:
    cred = credentials.Certificate("firebase_key.json")
    firebase_admin.initialize_app(cred)

db = firestore.client()

app = FastAPI()

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], 
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"], 
)

# 환경 변수 설정
DIFY_API_KEY = os.getenv("REACT_APP_DIFY_API_KEY")
WORKFLOW_ID = os.getenv("REACT_APP_DIFY_WORKFLOW_ID", "meditech")
DIFY_API_BASE = "https://api.dify.ai/v1"

# --- [이미지 업로드 함수] ---
def upload_image_to_dify(base64_string, user_id):
    try:
        if "," in base64_string:
            header, encoded = base64_string.split(",", 1)
        else:
            encoded = base64_string
            
        image_data = base64.b64decode(encoded)
        url = f"{DIFY_API_BASE}/files/upload"
        headers = {"Authorization": f"Bearer {DIFY_API_KEY}"}
        files = {'file': ('upload_image.jpg', image_data, 'image/jpeg')}
        data = {'user': user_id}
        
        print("📤 Dify로 이미지 업로드 시도 중...")
        response = requests.post(url, headers=headers, files=files, data=data)
        
        if response.status_code in [200, 201]:
            return response.json().get('id')
        return None
    except Exception as e:
        print(f"🔥 이미지 업로드 예외: {e}")
        return None

# --- [데이터 모델 정의] ---
class GuestLoginRequest(BaseModel):
    agreed: bool
    name: str
    phone: str

# --- [게스트 로그인 API] ---
# 여전히 사용자 정보(이름, 번호)는 DB에 저장합니다.
@app.post("/guest/login")
async def guest_login(request: GuestLoginRequest):
    if not request.agreed:
        return {"error": "개인정보 제공에 동의해야 합니다."}, 400
    
    # 1. UUID 생성
    random_uuid = str(uuid.uuid4())
    guest_user_id = f"guest_{random_uuid}"
    
    print(f"✅ 새 게스트 입장: {guest_user_id} ({request.name})")

    # 2. [DB 저장] 사용자 정보 (유지)
    try:
        db.collection("users").document(guest_user_id).set({
            "user_id": guest_user_id,
            "name": request.name,
            "phone": request.phone,
            "created_at": datetime.datetime.now(),
            "role": "guest"
        })
        print("💾 DB에 유저 정보 저장 완료!")
    except Exception as e:
        print(f"🔥 DB 저장 실패: {e}")

    return {
        "message": "로그인 성공",
        "user_id": guest_user_id,
        "role": "guest"
    }

# --- [채팅 API] ---
# ⭐️ 변경점: DB 저장 로직이 삭제되었습니다.
@app.post("/chat")
async def chat_endpoint(request: Request):
    body = await request.json()
    user_message = body.get("message", "")
    image_url = body.get("image_url")
    
    user_id = body.get("user_id", "anonymous_guest")

    print(f"\n📩 [요청] User: {user_id} / Msg: {user_message}")

    if not DIFY_API_KEY:
        return {"reply": "서버 오류: API 키 없음"}

    # 1. 이미지 처리
    image_files_payload = []
    if image_url and image_url.startswith("data:"):
        uploaded_file_id = upload_image_to_dify(image_url, user_id)
        if uploaded_file_id:
            image_files_payload.append({
                "type": "image",
                "transfer_method": "local_file",
                "upload_file_id": uploaded_file_id
            })
    elif image_url:
        image_files_payload.append({
            "type": "image",
            "transfer_method": "remote_url",
            "url": image_url
        })

    # 2. Dify 요청 Payload
    payload = {
        "workflow_id": WORKFLOW_ID,
        "inputs": {
            "Text_data": user_message, 
            "Image_input": image_files_payload,
        },
        "response_mode": "blocking",
        "user": user_id,
    }

    try:
        # Dify에 질문 전송
        res = requests.post(f"{DIFY_API_BASE}/workflows/run", headers={
            "Authorization": f"Bearer {DIFY_API_KEY}",
            "Content-Type": "application/json",
        }, json=payload)
        
        if res.ok:
            data = res.json()
            outputs = data.get("data", {}).get("outputs", {})
            
            final_info = outputs.get("Content_lore")
            final_comic = outputs.get("Card_lore")

            # ⭐️ [삭제됨] 여기에 있던 db.collection("chats").add(...) 코드가 사라졌습니다.
            # 이제 채팅 내용은 DB에 저장되지 않습니다.

            if final_info:
                return {"reply": final_info, "comic_url": final_comic}
            else:
                return {"reply": "AI 응답이 비어있습니다."}

        else:
            print("❌ Dify 오류:", res.text)
            return {"reply": f"오류 발생: {res.status_code}"}
            
    except Exception as e:
        print(f"🔥 서버 에러: {e}")
        return {"reply": "서버 내부 오류"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=3001)