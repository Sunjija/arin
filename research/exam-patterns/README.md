# 한능검 심화 기출 패턴 연구

공식 심화 **65~79회**(15회 × 50문항 = 750)의 수집·추출·분류·집계를 위한 분석 전용 작업이다.  
학습 앱의 문항 은행, 스케줄러, 모의고사 조립, 계정·결제·모바일 UI는 수정하지 않는다.

결과는 **공식 출제 비율**이 아니라, 확보한 공식 기출의 **관측 분포**이다.

## 재실행

원문 PDF·OCR·페이지 렌더는 `var/exam-patterns/`에만 두고 Git에서 제외한다.

```bash
# 단위 테스트 (네트워크·원문 PDF 불필요)
python3 scripts/exam-patterns/run.py test

python3 scripts/exam-patterns/run.py classify

# 수집(캐시 사용) → 추출 → 검증 → 집계 → 보고서
python3 scripts/exam-patterns/run.py all --skip-collect

# 공식 사이트에서 다시 목록·정답만 갱신 (이미 받은 파일은 재다운로드하지 않음)
python3 scripts/exam-patterns/run.py collect
python3 scripts/exam-patterns/run.py extract
python3 scripts/exam-patterns/run.py validate --allow-fail
python3 scripts/exam-patterns/run.py aggregate
python3 scripts/exam-patterns/run.py report
```

문제지 전 페이지 OCR(로컬만, Git 제외):

```bash
python3 scripts/exam-patterns/run.py extract --ocr-pages
```

79회 원본 대조 오버레이를 다시 쓰려면(기존 human 이력은 `replace` 없이는 덮이지 않음):

```bash
python3 scripts/exam-patterns/seed_round79_overlay.py
```

로컬 HTML: `research/exam-patterns/report.html` 을 브라우저로 연다. 원문 이미지는 넣지 않았다.

도구: Python 3.12, poppler 24.02, tesseract 5.3.4(+kor). 상세는 `sources/tooling.md`.

## 산출물

| 파일 | 용도 |
|---|---|
| `codebook.md` | 분류 기준·경계 |
| `manifest.json` | 회차 출처, 해시, 표지 검증, 정정 여부 |
| `items.jsonl` | 문항 메타(원문 문장 없음) |
| `overlays/reviews.jsonl` | AI/사람 수정. 재실행이 덮지 않음 |
| `coverage.json` | 확보·추출·자동분류·AI대조·사람검수 구분 |
| `distributions.json` | 관측 분포. 균등/최근 가중, 분모 명시 |
| `blueprint-candidates.json` | 모의고사 50문항 목표 후보 |
| `review-queue.csv` | 우선 검토 목록 |
| `handoff/` | 문항 개선·반복학습 에이전트 전달용 |
| `report.md`, `report.html` | 독립 열람 보고 |

## 다른 작업과의 계약

로드맵 `artifacts/question-quality-benchmark-roadmap.md`의 태그 필드(`round, number, points, era, topic, officialSkillType, internalFormatId, stimulusType, visualRequired, reasoningSteps, distractorStrategy`)를 포함하고, 검토 상태·출처 해시를 호환 가능하게 추가했다.  
앱의 `TARGET_FORMAT_MIX`는 여기서 바꾸지 않는다. 교체 후보는 `blueprint-candidates.json`이다.

## 이용 조건 (확인한 것만)

- 자료실에 최근 회차 문제지·정답표가 **공개 다운로드**로 올라 있다.
- 문항에 쓰인 **사진 저작권은 원저작자**에게 있다는 안내가 자료실에 있다.
- HTML 주석에 국사편찬위원회 저작권과 영리 이용 시 한국복제전송저작권협회 협의 문구가 남아 있다.
- **앱 재배포 허용은 확인하지 않았다.** 공개 다운로드 ≠ 재배포 허락.
- 원문 PDF·OCR·문제지 이미지는 저장소와 앱 배포물에 넣지 않는다.
