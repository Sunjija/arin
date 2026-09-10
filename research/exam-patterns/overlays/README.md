# 오버레이

`reviews.jsonl`의 한 줄은 `{id, field, value, status, by, tool, at, revision, replace}` 이다.

재실행(`extract`/`aggregate`)은 이 파일을 읽어 문항 메타에 다시 입힌다.  
`replace: true`이고 revision이 더 높지 않으면 기존 값을 덮지 않는다.  
사람 검수(`status: human`)는 실제로 사람이 보기 전에는 넣지 않는다.
