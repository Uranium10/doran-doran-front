# 부모님 책방과 동화 생성 후 화면 이동

작성일: 2026-09-18. 프론트 변경이며 API 요청/응답, DB, 환경변수 변경은 없다.

## 1. 부모님 책방

기존에는 아이별 기록 카드가 모두 세로로 쌓였다. 이제 상단 드롭다운에서 아이 한 명을 고르고 아래 세 탭에서 해당 아이의 기록만 확인한다.

| 탭 | 내용 | 기준 |
| --- | --- | --- |
| 읽기 성장 | 현재 단계·진척률, 생성·완독·퀴즈 완료 동화 수 | 기존 `/parent/overview` 집계와 `getTierProgress` |
| 문제 풀이 | 영역별 맞힌 문제/푼 문제, 최근 결과지 링크 | 최근 30회 실제 채점 문항, 최근 결과지 5개 |
| 동화 설정 | 다음 동화에 참고할 부모님 메모 | 기존 저장 API, 최대 1,000자 |

키보드 좌우 방향키·Home·End로 탭을 이동할 수 있다. 모바일에서도 세 탭은 같은 줄에 표시한다. 결과지를 열 때 해당 아이를 현재 프로필로 선택하고 `from=parent`를 전달해 부모님 화면으로 복귀한다.

선택 아이/탭만 `doran-view:{accountId}:parent` 세션 키에 보관한다. 기존 로그아웃 처리에서 함께 지워진다. 메모 초안은 아이별 React 상태로 보존하여 탭/드롭다운 변경 때 사라지지 않으며, 브라우저 저장소에는 쓰지 않는다. 페이지 새로고침/이탈 시 저장하지 않은 메모는 보존되지 않는다.

저장 요청은 시작 당시의 아이 ID와 내용을 캡처한다. 응답 도착 전에 다른 아이를 선택해도 원래 아이의 저장 상태만 갱신한다. 저장 중 해당 메모 입력을 잠그되 아이 선택은 가능하다. 실패하면 초안을 남기고 재시도할 수 있다. 계정 전환 시 화면을 재마운트하여 다른 계정의 메모와 기록이 남지 않게 한다.

관련 코드: `components/parent-dashboard.tsx`, `components/parent-dashboard.module.css`, `components/profile-picker.tsx`.

## 2. 디자인 및 이미지

크림 종이, 숲색, 황토색 책갈피를 중심으로 읽기 기록장 형태로 정리했다. 큰 색 카드 반복 대신 탭·구분선·숫자의 위계로 내용을 나눈다. 단계 카드는 짙은 녹색, 진척도는 부드러운 금색을 사용한다.

이미지 생성 방식: Codex 내장 **imagegen**, 신규 이미지 1장. 별도 외부 모델 API 호출 없음. 생성한 원본을 Sharp로 크기 조정/중앙 크롭/WebP 인코딩하여 다음 정적 파일로 배포한다.

| 파일 | 크기 | 용량 | 위치 |
| --- | --- | --- | --- |
| `reading-together.webp` | 960×640 | 105,312 bytes | 부모님 책방 상단 |
| `reading-together-thumb.webp` | 320×320 | 21,470 bytes | 프로필 선택의 부모님 썸네일 |

프로젝트 경로: `public/images/parent/`. 고정 이미지 치수를 지정해 로딩 시 공간이 흔들리지 않게 했다. 원본은 고도화 작업 폴더의 `release/parent-refresh/reading-together-original.png`에 보관한다.

### 사용한 프롬프트 원문

```text
Use case: illustration-story. Asset type: original editorial thumbnail / hero illustration for the parents' reading journal page of Doran Doran, a Korean children's storybook app. Create a refined, handmade gouache and colored-pencil illustration of a Korean parent and a small child sharing an open picture book at a low wooden reading table beside a softly lit window. Quiet affectionate attention, believable natural gestures, modest modern clothing. Include a small stack of beautifully bound storybooks and one simple leafy plant as reading-room details. Composition: landscape 3:2, an intimate contained vignette with generous warm ivory paper margins, all important subjects inside the central 80 percent so it can crop safely. Visual direction: accomplished picture-book illustration for a tasteful independent bookstore, lively irregular brush edges, visible paper grain, restrained shapes and thoughtful asymmetry; mature and warm, not babyish. Palette: warm cream, deep forest green, terracotta orange, muted butter yellow, natural walnut brown. No text, lettering, numbers, logos, watermarks, UI, frames, infographic icons or floating decorative sparkles. Avoid glossy 3D, stock-vector corporate style, over-smoothed faces, gradients and pastel rainbow clutter.
```

## 3. 생성 시작 후 자동 스크롤

1. `GenerationProvider.start()`가 생성 요청별 ID·프로필 ID를 가진 일회성 스크롤 요청을 남긴다.
2. 기존 컨트롤러가 대기 중 작업을 즉시 표시하고 API 접수를 시작한다.
3. 생성 입력 화면은 `router.push('/dashboard', { scroll: false })`로 이동한다. Next의 기본 맨 위 이동과 경쟁하지 않는다.
4. `MyBookshelf`가 해당 프로필의 생성 카드 DOM을 렌더링하면 두 번의 `requestAnimationFrame`으로 다음 레이아웃을 기다린다.
5. 카드에 스크롤 없이 포커스를 주고 `scrollIntoView`로 이동한다. `scroll-mt-24`로 고정 헤더 아래 여백을 확보한다. 모션 감소 설정이면 즉시 이동한다.
6. 요청을 소비한다. 이후 생성 단계 폴링, 책장 갱신, 일반 대시보드 재방문은 스크롤하지 않는다. 효과 해제 시 예약 프레임도 취소한다.

계정 변경이나 접수 실패 시 이동 의도를 정리한다. 고정 시간 타이머 또는 DOM을 찾는 반복 타이머는 사용하지 않는다. DOM 마운트와 화면 크기에 기반하므로 네트워크 접수가 느려도 대기 카드를 볼 수 있다.

관련 코드: `lib/generation-context.tsx`, `components/my-bookshelf.tsx`, `app/stories/new/page.tsx`.

## 4. 검증

- 독립 TypeScript 검사와 `next build --webpack`, `git diff --check` 통과. Next 설정의 타입 오류 무시 옵션에 의존하지 않는다.
- 합성 계정/기록과 네트워크 모의 응답을 사용하는 Playwright 브라우저 검사. 운영 DB 쓰기 및 실제 동화 생성 호출 없음.
- 1440px 데스크톱, 768/390/320px 화면에서 가로 넘침과 세 탭 확인, 스크린샷 시각 검토.
- 프로필별 데이터 분리, 작성 중 메모 보존, 저장 중 프로필 전환, 저장 실패 재시도, 선택 복원, 빈 목록/조회 오류 재시도, 썸네일 디코딩.
- 지연된 작업 접수/책장 조회, 모바일 모션 감소·데스크톱 기본 모션에서 헤더 아래 카드 스크롤, 폴링과 재방문 시 스크롤 재발 방지.
- 실제 모바일 기기나 운영 계정 검증은 하지 않았다. 로컬 프론트 수정이며 push/배포 전이다.

브라우저 검증 스크립트·결과·스크린샷: 고도화 폴더 `release/parent-refresh/`.
