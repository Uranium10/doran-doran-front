# 저학년용 실사 필기구

- 제작: 2026-09-25, 내장 image_gen 생성 및 투명 배경 정리 편집.
- 적용: `pen.webp`, `crayon.webp`, `eraser.webp`. 세 자산 합계 25,576바이트. 원본 알파를 보존하고 Sharp로 셀 분리·여백 제거·높이 320px·WebP 품질 88로 변환.
- 주의: 필기구 본체의 색은 고정이며, 실제 그릴 색은 팔레트 선택으로 표시한다.

## 최초 생성 프롬프트

Use case: product-mockup. Create a single photorealistic transparent PNG sprite sheet for a children's digital sketchbook toolbar. Exactly THREE isolated real stationery tools side by side in three equal-width cells: LEFT a navy teal felt-tip drawing pen with its black nib exposed and no cap; CENTER a chunky brick-red wax crayon with a softly worn rounded conical wax tip and cream paper wrapper; RIGHT a soft pink rectangular rubber eraser partly in a muted sage green paper sleeve. Tools point straight UP and are upright parallel, front-facing orthographic product photography, entire objects visible with comfortable transparent padding on all sides, same baseline, similar overall heights. Close macro photographic material: wax grain, paper fibers, matte rubber, subtle pen plastic reflections. Soft studio light, no cast shadows outside objects, no text, no branding, no hands, no props, no surface, no labels, no extra objects. True transparent background with alpha, not a drawn checkerboard. Wide 3:2 sheet. Real usable product cutouts rather than flat icons or cartoon. Keep all three objects separate with broad transparent gaps so each equal third can be displayed independently in a UI.

## 투명 배경 정리 프롬프트

Edit this sprite sheet: keep the same three photoreal stationery tools and their exact positions, shapes and materials. REMOVE ALL colored haze, glow, vignette, background and shadows outside the objects. Deliver clean die-cut product silhouettes on completely transparent alpha=0 background, only the solid stationery should remain. All interiors of the physical stationery must be fully opaque. No other changes. This is a UI sprite asset, edges must be clean and no glowing halos.
