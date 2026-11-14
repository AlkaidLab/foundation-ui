export default
{
  "title": "상태 검사",
  "start": "상태 검사 시작",
  "again": "다시 확인",
  "progress": "확인 중 {done}/{total}",
  "done": "{s}초 걸렸습니다",
  "groups": {
    "service": "Sunshine 서비스",
    "install": "설치",
    "process": "프로세스와 포트",
    "drivers": "드라이버",
    "gpu": "그래픽과 드라이버",
    "encoder": "인코더",
    "capture": "화면 캡처",
    "audio": "오디오",
    "input": "입력과 게임패드",
    "network": "네트워크",
    "system": "시스템",
    "host": "호스트 상태"
  },
  "sources": {
    "local": "이 PC"
  },
  "sourceTip": {
    "local": "제어판이 확인합니다. Sunshine가 실행 중이지 않아도 됩니다",
    "host": "Sunshine가 확인합니다. 실행 중이어야 합니다"
  },
  "states": {
    "idle": "시작 안 함",
    "queued": "대기 중",
    "running": "확인 중…",
    "offline": "Sunshine가 응답하지 않아 이 그룹은 확인하지 않았습니다"
  },
  "offlineTitle": "Sunshine가 응답하지 않음: {n}개 그룹 미확인",
  "offlineNext": "먼저 Sunshine를 실행하세요(서비스와 프로세스 및 포트에 이유가 있습니다). 그다음 다시 확인하세요.",
  "hostOffline": "Sunshine가 실행 중이 아닙니다. 이 PC의 확인만 결과가 있습니다",
  "sections": {
    "local": "이 PC의 확인",
    "host": "Sunshine의 확인"
  },
  "plan": {
    "title": "{n}개 그룹",
    "text": "{local}개 그룹은 제어판이 직접 확인하며 Sunshine가 멈춰 있어도 됩니다. 나머지 {host}개는 Sunshine가 확인합니다.",
    "textOffline": "Sunshine가 실행 중이 아닙니다. 이 PC의 {local}개 그룹만 확인할 수 있습니다."
  },
  "what": {
    "service": "상태, 시작 유형, 마지막 종료 코드",
    "install": "설치 폴더, 버전, 빌드",
    "process": "사용 중인 포트, 로그 끝의 오류",
    "drivers": "Foundation Virtual Display, ViGEmBus, 가상 마우스, USB/IP",
    "gpu": "그래픽 카드, 드라이버 버전, 어느 카드가 인코딩하는지",
    "capture": "테스트 프레임 하나",
    "vdd": "드라이버, HDR, 주사율",
    "audio": "출력 장치, 가상 사운드 카드, 마이크",
    "input": "ViGEmBus, DualSense, USB 전달",
    "network": "포트, 방화벽, UPnP, 인터넷, 메시",
    "system": "디스크 공간, 시간 동기화, 계정, 다시 시작 대기",
    "host": "버전, 가동 시간, 크래시, 구성 오류"
  },
  "last": {
    "title": "마지막 확인 {ago}",
    "empty": "마지막 확인은 결과가 전혀 없었습니다",
    "ago": {
      "now": "방금",
      "min": "{n}분 전",
      "hour": "{n}시간 전",
      "day": "{n}일 전"
    }
  },
  "checkedAt": "확인 {at}({ago})",
  "none": {
    "title": "결과가 있는 확인이 없습니다",
    "text": "{n}개 그룹 중 어느 것도 응답하지 않아, 이 PC가 정상인지 고장인지는 아직 말할 수 없습니다.",
    "reason": "첫 이유: {why}"
  },
  "failure": {
    "why": "이유",
    "next": "어떻게 할까",
    "detail": "돌아온 내용",
    "http": "상태 {status}",
    "hit": "{n}개 그룹: {names}"
  },
  "status": {
    "pass": "확인",
    "warn": "경고",
    "fail": "문제",
    "skip": "확인 안 됨"
  },
  "counts": {
    "fail": "문제 {n}개",
    "warn": "경고 {n}개",
    "skip": "미확인 {n}",
    "pass": "정상 {n}",
    "silent": "결과 없는 그룹 {n}"
  },
  "allGood": "모두 정상",
  "errors": {
    "unsupported": {
      "why": "이 버전에는 그 확인이 없습니다",
      "next": "Sunshine(또는 제어판)를 업데이트한 뒤 다시 확인하세요."
    },
    "auth": {
      "why": "로그아웃됨: Sunshine가 요청을 거부했습니다",
      "next": "다시 로그인한 뒤 확인하세요."
    },
    "invalid": {
      "why": "응답이 상태 검사 결과가 아닙니다. 응답한 쪽이 Sunshine 호스트가 아닐 수 있습니다",
      "next": "다시 확인하고, 그대로면 보고서를 내보낸 뒤 돌아온 내용을 넣어 피드백을 보내세요."
    },
    "failed": {
      "why": "확인이 실패했고 결과가 없습니다",
      "next": "다시 확인하고, 또 실패하면 보고서를 내보낸 뒤 돌아온 내용을 넣어 보내세요."
    }
  },
  "stream": {
    "live": "스트리밍 중입니다. {n}개는 확인할 수 없고, 정상도 문제도 아닙니다",
    "label": {
      "skipped": "스트리밍 중 미확인",
      "disturbed": "스트리밍 중에는 신뢰할 수 없음",
      "routed": "스트리밍 중에는 신뢰할 수 없음"
    },
    "why": {
      "skipped": "스트리밍 중이라 조사가 GPU를 쓰고 화면을 방해하므로 확인하지 않았습니다. 스트리밍이 끝난 뒤 다시 확인하세요.",
      "disturbed": "이것은 스트리밍 중에 잰 값이라 스트리밍의 영향일 수 있습니다. 정상도 문제도 아닙니다. 스트리밍이 끝난 뒤 다시 확인하세요.",
      "routed": "스트리밍 중에는 Sunshine가 소리 출력을 맡습니다. 지금 읽은 장치는 대기 중인 PC의 것이 아니라 판단할 수 없습니다. 스트리밍이 끝난 뒤 다시 확인하세요."
    },
    "read": "읽음: {detail}"
  },
  "rerunGroup": "이 그룹을 다시 확인",
  "export": "보고서 내보내기",
  "ai": "Mita AI에게 묻기",
  "fix": {
    "setting": "설정 열기",
    "page": "{page} 열기",
    "rerun": "다시 확인",
    "restart": "Sunshine 다시 시작",
    "link": "방법 보기",
    "repair": "복구",
    "start": "Sunshine 시작"
  },
  "pages": {
    "network": "네트워크",
    "audio": "오디오",
    "display": "디스플레이",
    "components": "구성 요소",
    "logs": "로그와 진단",
    "config": "구성 파일",
    "update": "정보와 업데이트"
  },
  "confirm": {
    "will": "하는 일",
    "admin": "관리자 권한이 필요합니다. Windows가 확인을 요청합니다.",
    "live": "스트리밍 중입니다. 이것을 실행하면 스트리밍이 끝납니다. 그 스트리밍으로 이 PC를 조작 중이면 연결이 끊기고 이 PC 앞으로 돌아와야 할 수 있습니다.",
    "run": "실행",
    "cancel": "취소"
  },
  "fixAt": "{group}의 {item}에서 복구하세요. 한 번 고치면 여기도 고쳐집니다.",
  "repairFailed": "완료되지 않음: {error}",
  "repairDone": "완료. 다시 확인하는 중",
  "aiPrompt": "이것은 Foundation Sunshine 호스트의 상태 검사입니다(이 PC와 Sunshine의 확인). 원인을 찾고 고치는 순서를 적어 주세요.",
  "aiOffline": "응답 없음"
}
