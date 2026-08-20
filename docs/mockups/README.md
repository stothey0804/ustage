# 가이드 페이지 목업 이미지

`/guide`의 스크린샷은 대부분 실제 캡처지만, 아래는 캡처로 담을 수 없어
생성 스크립트로 만든 목업이다.

| 결과물 | 스크립트 | 이유 |
| --- | --- | --- |
| `public/guide/10-scan-mobile.png` | `gen-scan.mjs` | 카메라 프리뷰가 실제 캡처에서 초록 단색으로 찍혀 알아볼 수 없다 |

재생성:

```bash
node docs/mockups/gen-scan.mjs public/guide/10-scan-mobile.png
```

`sharp`(프로젝트 의존성)로 SVG를 PNG로 굽는다. 크기를 바꾸면
`src/app/guide/page.tsx`의 `mockup()` 헬퍼 높이도 같이 맞춰야 한다.
QR 격자는 시드를 고정한 의사난수 — 스캔되는 실제 코드가 아니다.
