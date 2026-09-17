# 대시보드·스티커북 비주얼 개선 (2026-09-18)

## 적용 방향

사용자 요청: 기존 새 UI의 색감·버튼·구성이 단조롭고 관리 화면처럼 보여 어린이 책방에 맞게 개선. 추가 요청에 따라 스티커북 바로가기는 영역 전체를 갈색 양장본으로 구성했다.

- 진척도: 버터색 종이 바탕, 초록 원형 성장 배지, 살구색 작은 응원 띠. 측정과 마지막 문제 링크의 위치·기능 유지.
- 이어 읽기: 하늘색 무대, 기울어진 실제 책 표지, 구름과 책갈피. 살구색 버튼은 어두운 아래 면으로 눌리는 깊이 표현.
- 스티커북: 갈색 책등·바느질·속지·전용 그림·금색 봉인. 전체 표지 하나가 링크이며 중첩 버튼은 없다.
- 앨범 내부: 도트 속지와 제본 구멍, 종이 테이프로 붙인 스티커, 인물의 말을 담은 메모지. 친구/만점 장식 구분과 날짜·출처 유지.
- 빈 앨범: 그림과 안내, 기존 라이브러리로 이동하는 버튼.
- 모바일: 3카드 가로 스크롤과 가장자리의 다음 카드 노출. 카드 외부 문서 가로 넘침 없음.

## 수정 파일

components/dashboard-summary.tsx / dashboard-summary.module.css  
components/sticker-collection.tsx / sticker-book.module.css  
app/stickers/page.tsx  
public/images/stickers/reading-friends.webp

기존 채점·획득 규칙·큐·DB·API 형식 변경 없음. 통신규격 추가 변경 불필요. 백엔드 재배포나 신규 환경변수 없음.

## 삽화 제작·최적화

내장 image_gen 도구 사용(별도 API 키를 사용하는 CLI 호출 아님).
- 사용 이미지: public/images/stickers/reading-friends.webp
- 크기: 600×600, 91,230 bytes(약 89KiB), WebP quality 83.
- 고도화 폴더 원본: sticker-book/reading-friends-original.png.
- 제목·버튼·문구는 그림에 그리지 않고 HTML로 표시한다.
- 원본은 보존하고 Sharp로 전달용 해상도와 포맷만 최적화했다.
- 각 스티커의 유료 생성 결과가 아니라 대시보드와 앨범 장식용 공통 삽화다.

### 최종 생성 프롬프트

```text
Create a finished illustration asset for a Korean children's reading app, a beautiful illustrated sticker collecting album cover vignette. Square canvas, edge to edge warm ivory background. A young orange Korean folktale tiger with expressive black stripes and small rounded ears, a tiny friendly teal dokkaebi with one little horn, and a white rabbit with coral pink cheeks are gathered around an open red storybook in a lush little garden. The tiger slightly larger, reading with joy; all 3 friendly but not babyish, age 5-10 audience. Small butter-yellow sun, cobalt blue flowers and strawberry-red blossoms, a few pencil stars; a playful balanced composition. Hand-painted gouache and colored pencil on tactile cream paper, sophisticated independent children's picture-book illustration, imperfect expressive outlines, subtle dry brush, flat shapes and limited palette: burnt coral, butter yellow, cornflower/cobalt blue, leafy teal. Central subjects fill 80 percent of canvas, contained composition with quiet ivory edges so it sits on a paper album cover. High craft, charming distinctive character poses, no generic vector icons, no 3D, no plastic, no gradients, no glossy lighting, no lettering, no typography, no text, no watermark, no UI, no book mockup, no border. This is the actual illustration to place on a cover, not a photograph of a book.
```

## 검증

- npx tsc --noEmit, npm run build 통과.
- Playwright: 앨범 이동, 준비 중→완료, 결과지 스티커, 재도전·새로고침 복구, 오류·빈 앨범 통과. 운영 API는 모의 데이터로 대체.
- 320 / 390 / 768 / 1024 / 1440px: 카드 내용 높이와 문서 가로 넘침 검사 통과.
- 긴 동화 제목 줄 잘림 보정. 100% 진척도와 긴 이름 확인.
- 비활성 재측정 버튼 호버 전후 크기 불변, 키보드 포커스, prefers-reduced-motion 확인.
- 실제 이미지 품질·스티커 지급 로직은 이전 구현 검증 범위이며 이번 변경은 시각 디자인에 한정.

미리보기는 고도화 폴더 sticker-book/dashboard-visual-v2.png, sticker-book/sticker-book-desktop.png에 저장했다.

