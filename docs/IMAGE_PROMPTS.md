# 종이인형극 이미지 제작 기록

- 2026-09-18, 내장 image_gen 도구 사용. CLI/API 키 경로는 사용하지 않음.
- 생성 원본: 이 폴더 originals/*.png (해·달·파도·도깨비·호랑이).
- 서비스 자산: 프론트 public/images/theatre/*.webp.
- 다섯 파일 합계 161,286 bytes (약 158 KiB). 원본 알파 보존, sharp resize/품질78/alphaQuality90/effort6.
- sun/moon/tiger/dokkaebi 최대 360×420, waves 최대 880×440. animation은 transform만 변경, 별도 프레임/GIF/영상/유료 생성 호출 없음.

## 공통 프롬프트

Use case: illustration-story. Asset type: transparent PNG sprite for a Korean children's story loading screen, a handmade paper puppet theatre. Genuine transparent alpha background, no backdrop, no text, no watermark, no border. Flat cut-paper silhouette with warm crayon/colored-pencil grain, slightly irregular handmade edges, sophisticated Korean picture book charm, friendly to small children. Whole subject centered with 8 percent transparent margin; no cropped edges. Muted ochre, terracotta, cream, sage, midnight teal palette. Only one subject.

## sun

Subject: A cheerful golden ochre sun with rounded triangular paper rays, tiny rosy cheeks and a gentle closed-eye smile, no stick or strings.

## moon

Subject: A sleepy crescent moon in cream and pale golden yellow, tiny peach cheek and two small sleepy eyes, a delicately curved paper cutout, no stars or strings.

## waves

Subject: A wide low horizontal strip of layered teal and sage ocean waves with four broad curling crests, cream pencil foam marks, flat base and transparent above, a paper puppet theatre foreground, landscape aspect ratio.

## dokkaebi

Subject: A single adorable small Korean dokkaebi goblin paper puppet, full body, one small horn, friendly terracotta orange face, little teal vest and cream trousers, round nose, smiling and waving one hand, holding a tiny traditional club at its side, absolutely not scary, no stick underneath.

## tiger

Subject: A single friendly Korean folktale tiger paper puppet, full body sitting with curved tail, golden ochre fur and charcoal crayon stripes, cream belly, round smiling cheeks, gentle wide eyes, cute but tasteful picture-book illustration, no stick underneath.

## 도깨비 최종 수정 프롬프트

Edit only the background and edge of this paper dokkaebi sprite. Preserve the exact character, pose, crayon texture and colors. Remove ALL ambient orange glow, shadows, blur and backdrop outside the solid paper silhouette. Genuine completely transparent alpha background, clean cutout edges, NO feathered shadow/glow. The character will be composited onto a pale cream theatre stage. Full body.

