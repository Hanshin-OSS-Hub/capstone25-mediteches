export const CONSENT_VERSION = '2026-05-31';

export const TERMS_OF_SERVICE = (
  <>
    <p className="font-semibold text-gray-800 mb-2">메디테치 바디맵 서비스 이용약관</p>
    <p className="mb-2">
      본 약관은 메디테치 바디맵(이하 &quot;서비스&quot;) 이용과 관련하여 서비스 제공자와 이용자 간의
      권리·의무를 규정합니다.
    </p>
    <ol className="list-decimal list-inside space-y-1 mb-2">
      <li>서비스는 의료 진단·치료를 대체하지 않으며, 증상 설명 및 의료 정보 이해를 보조합니다.</li>
      <li>이용자는 정확한 정보를 입력해야 하며, AI 결과는 참고용입니다.</li>
      <li>서비스 이용 중 발생하는 의료적 판단은 반드시 의료 전문가와 상담해야 합니다.</li>
      <li>서비스 중단·변경 시 사전 공지를 원칙으로 합니다.</li>
    </ol>
    <p>시행일: 2026년 5월 31일</p>
  </>
);

export const PRIVACY_POLICY = (
  <>
    <p className="font-semibold text-gray-800 mb-2">개인정보 수집 및 이용 동의서</p>
    <p className="mb-2">
      「개인정보 보호법」에 따라 메디테치 바디맵 서비스 이용을 위해 아래와 같이
      개인정보를 수집·이용합니다.
    </p>
    <table className="w-full border-collapse text-left mb-3">
      <thead>
        <tr className="border-b border-gray-300">
          <th className="py-1.5 pr-2 font-semibold text-gray-800">항목</th>
          <th className="py-1.5 font-semibold text-gray-800">내용</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200">
        <tr>
          <td className="py-1.5 pr-2 font-medium text-gray-700">수집 항목</td>
          <td className="py-1.5">이름, 연락처, 증상 기록</td>
        </tr>
        <tr>
          <td className="py-1.5 pr-2 font-medium text-gray-700">수집 목적</td>
          <td className="py-1.5">서비스 이용자 식별, 증상 기록 및 진료 보조 정보 제공</td>
        </tr>
        <tr>
          <td className="py-1.5 pr-2 font-medium text-gray-700">보유 기간</td>
          <td className="py-1.5">서비스 이용 종료 시 또는 수집일로부터 1년 후 파기</td>
        </tr>
      </tbody>
    </table>
    <p>
      귀하는 위 동의를 거부할 권리가 있으며, 동의 거부 시 서비스 이용이 제한될 수 있습니다.
    </p>
  </>
);

export const SENSITIVE_INFO_POLICY = (
  <>
    <p className="font-semibold text-gray-800 mb-2">민감정보(주민등록번호) 처리 동의서</p>
    <p className="mb-2">
      「개인정보 보호법」 제23조에 따라 주민등록번호 등 민감정보를 아래와 같이 처리합니다.
    </p>
    <table className="w-full border-collapse text-left mb-3">
      <thead>
        <tr className="border-b border-gray-300">
          <th className="py-1.5 pr-2 font-semibold text-gray-800">항목</th>
          <th className="py-1.5 font-semibold text-gray-800">내용</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200">
        <tr>
          <td className="py-1.5 pr-2 font-medium text-gray-700">수집 항목</td>
          <td className="py-1.5">주민등록번호</td>
        </tr>
        <tr>
          <td className="py-1.5 pr-2 font-medium text-gray-700">수집 목적</td>
          <td className="py-1.5">병원 연계 본인 확인, 진료 정보 매칭</td>
        </tr>
        <tr>
          <td className="py-1.5 pr-2 font-medium text-gray-700">보관 방식</td>
          <td className="py-1.5">PQC(ML-KEM-768) + AES-256 암호화, 병원 전용 복호화</td>
        </tr>
        <tr>
          <td className="py-1.5 pr-2 font-medium text-gray-700">보유 기간</td>
          <td className="py-1.5">이용 목적 달성 후 즉시 파기(법령 보관 의무 제외)</td>
        </tr>
      </tbody>
    </table>
    <p>앱 내에서는 주민등록번호를 표시하지 않으며, 병원 직원만 감사 로그와 함께 열람할 수 있습니다.</p>
  </>
);
