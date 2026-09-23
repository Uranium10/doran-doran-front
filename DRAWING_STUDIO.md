# 그림에서 만드는 동화 — 전체 화면 도구 / 단계별 입력

2026-09-24. 프론트 기능 구현, 기존 그림 분석·생성 API/DB 및 LangGraph 경로 유지.

## 아이가 보는 흐름

그림/사진 → 완성 그림 미리보기와 기기 저장 선택 → 그림 이야기(글 또는 음성) → 분석 → 주인공 표시 → 이름 → 원하는 사건 → 필요한 추가 질문(최대 2개, 하나씩) → 이해한 내용 바로잡기 → 그림 도깨비 → 낭독 선택 → 최종 확인 → 기존 생성 작업 접수.

- 그림 도구에서 앱 헤더를 숨기고 100dvh 고정. 완료 후 헤더와 이전 단계 복귀.
- 왼쪽 위 뒤로가기는 초안이 사라짐을 모달로 확인한다. 서버에 이미 보관된 원본은 별도 보관함에서 삭제한다.
- 사진/그림을 전환해도 그린 선과 사진은 유지. 미리보기 왕복에서도 실행 취소 기록을 유지.
- 마스코트는 분석 중 생각 구름, 입력 중 해당 질문 말풍선을 표시한다.
- 모든 질문의 답은 기존 ConfirmDrawing 구조체로 보낸다. 모델이 제시한 질문은 최대 2개이며, 선택적 답은 비워도 진행한다.

## 재사용 가능한 도구

`Sketchbook`는 라우터·프로필·API와 분리된 controlled 컴포넌트다. value/onChange, background/onBackgroundChange, width/height, disabled/onBusyChange로 연결한다.

- 펜, 색연필, 에어브러시, 지우개, 경계 채우기, 올가미 선 선택/이동/크기 조절/삭제
- 색상·채도·밝기 선택, 8색 팔레트, 종이색, 전경/배경 교환, 붓과 지우개 크기, 불투명도
- 실행 취소/다시 실행(최대 30개), 전체 지우기 확인
- 선은 정규화 좌표, 반응 중 포인터는 ref, 렌더는 requestAnimationFrame. 기존 선 캔버스와 진행 중 선 캔버스 분리.
- 넓은 채우기는 Web Worker에서 비재귀 영역 탐색 후 행 단위 결과를 반환한다. 픽셀 버퍼 이전으로 복사량을 줄인다. 계산 중 완료/도구 변경을 잠가 결과 유실을 막는다.
- 최대 500개 선, 선당 12,000점, 전체 데이터/채우기 결과 상한. 외부 라이브러리 추가 없음.
- 새 모바일 그림은 900×1300, 데스크톱은 900×650. 초안에 paperHeight를 보관하여 회전·재접속해도 종이 비율 보존. 구형 초안은 900×650으로 해석한다.
- 원본은 IndexedDB에 짧게 보관하는 기존 정책을 유지한다. 서버에는 평탄화한 JPEG만 보낸다.

### 현재 범위 / 후속 과제

올가미는 **선 객체 단위** 선택이며 픽셀 영역 절단/여러 레이어 편집은 아니다. 채우기 영역 자체는 올가미 선택 대상에서 제외한다. 프로필 꾸미기에서 사진·스티커 레이어/회전/확대 기능은 별도 확장이 필요하다. 실제 저사양 휴대폰·압력펜 체감 검증은 이번 데스크톱 브라우저 검증에 포함되지 않았다.

## 생성 1편 실측

합성 그림: 노란 별 모양 로봇 별콩이(파란 꼬리)가 목마른 구름 친구에게 물을 주고 싶다는 설명. 개인정보/실제 아동 그림은 사용하지 않았다.

| 항목 | 결과 |
|---|---:|
| 그림 분석 | 4.891초 |
| 생성 그래프 | 85.109초 |
| 합계 | 90.003초 |
| Gemini 분석·계획·후보 2개·판별 | $0.022208 |
| GPT Image 캐릭터 시트+표지+5장면 | $0.203645 |
| 한 편 추정 합계 | $0.225853 |

위 금액은 실제 응답 토큰으로 계산한 추정액이고 청구서 금액은 아니다. 6단계, 음성 끔, 규칙상 퀴즈 없음. 스티커, 서버 업로드/DB 저장, 사용자가 질문에 답하는 시간은 제외했다. 어휘 검색은 로컬 테스트에서 빈 목록으로 주입했다. 계획·후보·판별·이미지 프롬프트는 현재 운영 코드 그대로 사용했다.

최초 측정 스크립트의 favorite 빈 필드 누락으로 분석 1회 뒤 생성 전에 멈춘 비용 $0.003847를 별도 기록했다. 재실행을 포함한 전체 유료 테스트 추정액은 $0.229701다. 생성된 동화는 한 편뿐이다.

본문 5장, 캐릭터 시트, 표지, 5개 이미지가 모두 준비됨을 확인했다. 별 모양/파란 꼬리/구름/물 주기 의도가 반영됐다. 일부 장면은 분할 만화 구도로 생성되므로 ‘한 컷 한 장면’ 고정 품질까지 보장하는 검증은 아니다. 실제 아이의 자유 그림으로 추가 사용자 검증이 필요하다.

요금 근거(2026-09-24 확인): [Gemini](https://ai.google.dev/gemini-api/docs/pricing) 입력 $0.75/M, 출력·추론 $3.75/M(2026-12-31까지). [OpenAI](https://developers.openai.com/api/docs/pricing) GPT Image 2.5 Flare 텍스트 입력 $5/M, 이미지 입력 $8/M, 이미지 출력 $30/M. 캐시 할인은 계산하지 않았다.

## 검증

- 별도 작업본 TypeScript 검사 통과.
- 프론트 회귀 테스트 60개 통과(채우기 경계·원본 보존·좌표 제한·세로 전체 면적 포함).
- Next.js webpack 프로덕션 빌드 통과. 별도 작업본의 모의 API/QA 라우트는 제품 저장소에 복사하지 않는다.
- 브라우저 390×844: 선 그리기, 실행 취소/복원, 비동기 채우기, 미리보기, 글 입력, 분석 대기, 주인공 선택, 단계별 질문, 화가·음성 선택, 최종 생성 요청 접수. 브라우저 오류 로그 없음.
- 운영 API/DB 스키마 변경 없음. 이번 요청에는 push/배포를 포함하지 않아 로컬 변경 상태로 준비.

## 파일

- `components/workpad/sketchbook.tsx`, `sketchbook.module.css`: 도구
- `lib/sketchbook.ts`, `sketchbook-fill.worker.ts`: 선 렌더·선택·채우기
- `components/workpad/drawing-story-setup.tsx`, `drawing-wizard.module.css`: 단계 입력
- `components/workpad/creation-page.tsx`: 헤더/전체화면 전환
- `public/images/blue-mascot-v2.webp`: 384px 투명 새 남아 얼굴 (37,404 bytes)

마스코트: 내장 ImageGen 생성(기존 시트는 참조), 투명 PNG를 WebP로 최적화. 원본·측정자료·백업은 고도화 폴더의 `drawing-studio-work/`에 보관한다.

### 마스코트 생성 프롬프트

Use case: illustration-story. Create ONE clean production UI mascot asset based on the BLUE BOY goblin-costume child in the reference. Single front-facing friendly little boy, chest-up portrait, blue Korean hanbok and blue soft goblin hood with two small golden horns, brown hair, exactly two natural evenly placed human eyes, warm gentle smile, anatomically coherent face and hands. Hold one small drawing pencil near chest. Soft polished watercolor storybook rendering matching reference. Entire head, horns and shoulders fit inside a generous square with 10% padding. Genuinely transparent background, no text, no sheet, no extra faces, no surrounding objects. This will be an 88px illustrator choice icon and 140px conversational guide. Keep face especially readable, calm and appealing to children.
