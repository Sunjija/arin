# 실행 도구

확인일: 2026-09-10. 유료 OCR/API는 쓰지 않았다.

| 도구 | 버전 |
|---|---|
| Python | 3.12.3 |
| Node | 22.14.0 |
| pdftotext / pdftoppm (poppler) | 24.02.0 |
| tesseract | 5.3.4 (`kor`, `eng`, `osd`) |

문제지 중 70·71·72·75·76·77회는 `pdftotext`로 한글이 추출된다.  
65~69, 73~74, 78~79회는 이미지 PDF라 표지 확인과 전 페이지 OCR이 필요하다.
