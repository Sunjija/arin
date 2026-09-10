"""Seed AI source-check overlays for round 79 after viewing rendered pages. Abstracts only."""

from __future__ import annotations

import json
from pathlib import Path

from common import RESEARCH_DIR, item_id, utc_now_iso

NOW = utc_now_iso()
BY = "cursor-grok-4.6"
TOOL = "rendered-page-review-round-79"

# Abstracts only. No official stem/choice text.
ITEMS = [
    dict(n=1, era="prehistoric", sec=[], topic="구석기 생활상", concepts=["구석기", "뗀석기", "석장리", "굴포리"], people=[], events=["석장리·굴포리 발굴"], inst=[], skill="source_analysis", fmt="source-what", stim=["photo", "instructional_text", "composite"], vis=True, vis_r="신문 형식 자료와 유적·유물 사진이 시대 식별의 핵심", steps=2, sol="발굴된 뗀석기 단서로 구석기를 식별한 뒤 주거·생업 선지를 고른다", dist="adjacent_period_markers", conf=["신석기 빗살무늬", "청동기 고인돌", "가락바퀴"], exposed=False, page=1),
    dict(n=2, era="prehistoric", sec=[], topic="초기 국가 풍습 비교", concepts=["부여", "옥저", "동예", "삼한", "소도"], people=[], events=[], inst=["제가 회의"], skill="conclusion_evaluation", fmt="king-compare", stim=["table", "instructional_text"], vis=True, vis_r="(가)(나) 칸의 풍습 표가 대상 국가를 가른다", steps=2, sol="표의 풍습으로 두 나라를 식별한 뒤 옳은 연결을 고른다", dist="same_era_institutions", conf=["고조선 8조법", "삼한 소도"], exposed=False, page=1),
    dict(n=3, era="three-kingdoms", sec=[], topic="4세기 고구려 대외 관계", concepts=["고구려", "고국원왕", "평양성"], people=["고국원왕", "광개토대왕"], events=["평양성 함락"], inst=[], skill="source_analysis", fmt="source-what", stim=["photo", "dialogue", "composite"], vis=True, vis_r="고분 발굴 사진과 교사-학생 대화가 인물·사건을 가리킨다", steps=2, sol="고분·대화 단서로 왕과 전후 사실을 연결한다", dist="adjacent_period_markers", conf=["소수림왕 불교", "광개토왕 정복"], exposed=False, page=1),
    dict(n=4, era="three-kingdoms", sec=[], topic="금관가야 대외 교역", concepts=["금관가야", "김해 대성동"], people=[], events=[], inst=[], skill="source_analysis", fmt="source-what", stim=["photo", "dialogue"], vis=True, vis_r="전시 유구 그림과 안내 대사가 나라 식별에 필요하다", steps=2, sol="김해 고분 전시 단서로 가야를 식별한 뒤 경제 선지를 고른다", dist="same_era_institutions", conf=["백제 무역", "신라 무역"], exposed=False, page=1),
    dict(n=5, era="three-kingdoms", sec=["north-south"], topic="최치원과 신라 문장", concepts=["최치원", "난랑비서", "6두품"], people=["최치원"], events=[], inst=["독서삼품과"], skill="source_analysis", fmt="source-who", stim=["photo", "text_source"], vis=True, vis_r="초상과 인물 소개 카드가 대상을 가리킨다", steps=2, sol="문장가 소개로 인물을 식별한 뒤 관련 사실을 고른다", dist="same_era_institutions", conf=["설총", "강수", "김대문"], exposed=False, page=2),
    dict(n=6, era="three-kingdoms", sec=["culture"], topic="백제 석탑 양식", concepts=["정림사지 오층석탑", "백제 멸망"], people=[], events=["황산벌 전투"], inst=[], skill="source_analysis", fmt="heritage-period", stim=["photo"], vis=True, vis_r="석탑 사진 선지 식별이 질문의 핵심이다", steps=2, sol="설명과 사진을 맞춰 해당 석탑을 고른다", dist="similar_org_lineage", conf=["미륵사지 석탑", "불국사 석탑"], exposed=False, page=2),
    dict(n=7, era="three-kingdoms", sec=[], topic="신라 지방 편제", concepts=["9주 5소경", "삼국사기 지리지"], people=[], events=[], inst=["9주"], skill="source_analysis", fmt="source-what", stim=["text_source"], vis=False, vis_r="문헌 인용만으로 제도를 식별할 수 있다", steps=2, sol="주·군 관할 서술로 신라 9주를 식별한다", dist="same_era_institutions", conf=["골품", "진대법", "기인"], exposed=False, page=2),
    dict(n=8, era="three-kingdoms", sec=["north-south"], topic="국학", concepts=["국학", "독서삼품과"], people=[], events=[], inst=["국학"], skill="source_analysis", fmt="policy-content", stim=["text_source"], vis=False, vis_r="사료 인용만으로 교육 기관을 식별한다", steps=2, sol="유학 교육·관리 선발 단서로 국학을 고른다", dist="same_era_institutions", conf=["태학", "주자감", "성균관"], exposed=False, page=2),
    dict(n=9, era="three-kingdoms", sec=[], topic="김유신의 활동", concepts=["김유신", "통일 전쟁"], people=["김유신", "김춘추"], events=["백제 멸망"], inst=[], skill="source_analysis", fmt="source-who", stim=["text_source"], vis=False, vis_r="두 문헌 단서만으로 인물을 식별한다", steps=2, sol="고구려·백제 관련 전공 단서로 인물을 고른다", dist="same_era_institutions", conf=["김춘추", "계백", "을지문덕"], exposed=False, page=2),
    dict(n=10, era="north-south", sec=[], topic="혜공왕 말~장보고 사이 사건", concepts=["김헌창의 난", "상대등"], people=["김헌창", "장보고"], events=["김헌창의 난"], inst=[], skill="chronology", fmt="chronology-events", stim=["text_source"], vis=False, vis_r="두 사료의 시간 구간만 판단하면 된다", steps=3, sol="두 사료가 정한 시간 사이의 사건을 고른다", dist="adjacent_period_markers", conf=["견훤", "최치원 시무책", "원광 걸사표"], exposed=False, page=3),
    dict(n=11, era="north-south", sec=["culture"], topic="통일신라 불교 공예", concepts=["청석탑", "통일신라 공예"], people=[], events=[], inst=[], skill="source_analysis", fmt="heritage-period", stim=["photo", "dialogue"], vis=True, vis_r="유물 사진 선지가 식별의 핵심이다", steps=2, sol="출토 설명과 사진을 연결한다", dist="similar_org_lineage", conf=["백제 금동 향로", "고려 청자"], exposed=False, page=3),
    dict(n=12, era="goryeo", sec=[], topic="고려 전기 상업과 화폐", concepts=["시전", "주전도감", "숭녕통보"], people=[], events=[], inst=["시전"], skill="source_analysis", fmt="source-what", stim=["text_source"], vis=False, vis_r="문헌만으로 시대 경제를 읽는다", steps=2, sol="시전·주전 단서로 고려 상업 선지를 고른다", dist="adjacent_period_markers", conf=["조선 후기 공인", "조선 상평통보"], exposed=False, page=3),
    dict(n=13, era="goryeo", sec=[], topic="거란 침입과 서희·강감찬", concepts=["강동 6주", "귀주대첩"], people=["서희", "강감찬"], events=["거란의 침입"], inst=[], skill="source_analysis", fmt="source-who", stim=["table", "instructional_text"], vis=True, vis_r="드라마 구성표의 회차 내용이 왕·사건을 가리킨다", steps=2, sol="표의 사건 순서로 왕을 식별한 뒤 재위 사실을 고른다", dist="same_era_institutions", conf=["공민왕", "광종"], exposed=False, page=3),
    dict(n=14, era="goryeo", sec=[], topic="이자겸의 난과 무신 정변 사이", concepts=["이자겸의 난", "무신 정변", "묘청의 난"], people=["이자겸", "이의방"], events=["묘청의 난"], inst=[], skill="chronology", fmt="chronology-events", stim=["text_source"], vis=False, vis_r="두 사료 구간 판단", steps=3, sol="두 정변 사이의 사건을 고른다", dist="adjacent_period_markers", conf=["만적의 난", "쌍기", "서희"], exposed=False, page=4),
    dict(n=15, era="goryeo", sec=["culture"], topic="삼국유사", concepts=["삼국유사", "일연"], people=["일연"], events=[], inst=[], skill="source_analysis", fmt="source-what", stim=["photo", "instructional_text"], vis=True, vis_r="디지털 뷰어에 제시된 문헌 형태가 단서다", steps=2, sol="구성·내용 설명으로 문헌을 식별한다", dist="adjacent_period_markers", conf=["삼국사기", "제왕운기"], exposed=False, page=4),
    dict(n=16, era="goryeo", sec=[], topic="원 간섭기 사회", concepts=["원 간섭기", "공녀", "변발 호복"], people=[], events=[], inst=[], skill="situation_issue", fmt="source-what", stim=["text_source"], vis=False, vis_r="문헌 대화만으로 시대상 식별", steps=2, sol="원 사신·풍속 단서로 원 간섭기 모습을 고른다", dist="adjacent_period_markers", conf=["무신 집권", "공민왕 개혁"], exposed=False, page=4),
    dict(n=17, era="goryeo", sec=[], topic="위화도 회군 전후 연표", concepts=["위화도 회군", "과전법", "제1차 왕자의 난"], people=["최영", "이성계"], events=["위화도 회군"], inst=[], skill="chronology", fmt="chronology-labeled", stim=["timeline", "dialogue"], vis=True, vis_r="연표 칸 (가)~(마)를 자료와 맞춰야 한다", steps=3, sol="대화 속 시점을 연표 빈칸에 놓는다", dist="order_permutation", conf=["공민왕 개혁", "삼별초"], exposed=False, page=4),
    dict(n=18, era="joseon-early", sec=[], topic="신숙주와 해동제국기", concepts=["신숙주", "해동제국기", "훈민정음"], people=["신숙주"], events=[], inst=["집현전"], skill="source_analysis", fmt="source-who", stim=["photo", "dialogue"], vis=True, vis_r="서원 전각 사진과 안내가 인물을 가리킨다", steps=2, sol="서원·저술 단서로 인물을 식별한다", dist="same_era_institutions", conf=["정인지", "성삼문", "최만리"], exposed=False, page=5),
    dict(n=19, era="joseon-early", sec=[], topic="세종 사가독서", concepts=["사가독서", "집현전"], people=["세종"], events=[], inst=["집현전"], skill="historical_knowledge", fmt="king-policy-match", stim=["instructional_text", "text_source"], vis=False, vis_r="해설형 텍스트만으로 정책을 고른다", steps=2, sol="사가독서 설명으로 해당 왕 정책을 고른다", dist="same_era_institutions", conf=["경국대전", "대전통편"], exposed=False, page=5),
    dict(n=20, era="joseon-early", sec=[], topic="직전법", concepts=["직전법", "과전법"], people=["세조"], events=[], inst=["직전법"], skill="source_analysis", fmt="policy-name", stim=["dialogue", "text_source"], vis=False, vis_r="대화 속 수취 문제만으로 제도를 고른다", steps=2, sol="수신전·과전 폐단 단서로 직전법을 고른다", dist="same_era_institutions", conf=["과전법", "공신전"], exposed=False, page=5),
    dict(n=21, era="joseon-late", sec=[], topic="조선 후기 장시", concepts=["장시", "난전"], people=[], events=[], inst=["공인"], skill="situation_issue", fmt="source-what", stim=["photo", "dialogue"], vis=True, vis_r="시장 풍속화가 시대상 판단에 필요하다", steps=2, sol="장시 장면으로 후기 상업 모습을 고른다", dist="adjacent_period_markers", conf=["육의전", "시전"], exposed=False, page=5),
    dict(n=22, era="joseon-late", sec=[], topic="임진왜란과 광해군 사이", concepts=["임진왜란", "광해군", "실리 외교"], people=["이순신", "광해군"], events=["임진왜란"], inst=[], skill="chronology", fmt="chronology-events", stim=["text_source"], vis=False, vis_r="두 사료가 정한 구간", steps=3, sol="전쟁기 사료와 여진 출병 사료 사이의 사실을 고른다", dist="adjacent_period_markers", conf=["병자호란", "기유약조"], exposed=False, page=6),
    dict(n=23, era="joseon-late", sec=[], topic="영조 균역법", concepts=["균역법", "영조"], people=["영조"], events=[], inst=["균역법"], skill="source_analysis", fmt="king-policy-match", stim=["photo", "instructional_text"], vis=True, vis_r="군영 관련 그림과 해설이 왕을 가리킨다", steps=2, sol="균역 단서로 왕과 재위 사실을 연결한다", dist="same_era_institutions", conf=["대동법", "영정법"], exposed=False, page=6),
    dict(n=24, era="joseon-early", sec=[], topic="승정원 왕명 문서", concepts=["유지", "승정원"], people=[], events=[], inst=["승정원"], skill="source_analysis", fmt="policy-name", stim=["photo", "instructional_text", "composite"], vis=True, vis_r="문서 이미지 형태가 기구 식별에 필요하다", steps=2, sol="왕명 문서 형식과 사례로 담당 기구를 고른다", dist="same_era_institutions", conf=["의정부", "비변사", "규장각"], exposed=False, page=6),
    dict(n=25, era="joseon-late", sec=["culture"], topic="최한기의 기학", concepts=["최한기", "기측체의"], people=["최한기"], events=[], inst=[], skill="source_analysis", fmt="source-who", stim=["photo", "dialogue"], vis=True, vis_r="전시 설명과 유물이 인물을 가리킨다", steps=2, sol="저작·사상 단서로 실학자를 고른다", dist="same_era_institutions", conf=["정약용", "박지원", "최한기"], exposed=False, page=6),
    dict(n=26, era="joseon-late", sec=[], topic="조선 후기 사행과 통역", concepts=["역관", "사행", "왜관"], people=[], events=[], inst=["사역원"], skill="source_analysis", fmt="source-what", stim=["text_source"], vis=False, vis_r="문헌 서술만으로 직역을 고른다", steps=2, sol="통역·사행 단서로 해당 직임을 고른다", dist="same_era_institutions", conf=["무관", "서얼"], exposed=False, page=7),
    dict(n=27, era="joseon-late", sec=[], topic="홍경래의 난", concepts=["홍경래의 난", "정주성"], people=["홍경래"], events=["홍경래의 난"], inst=[], skill="source_analysis", fmt="source-what", stim=["photo", "dialogue"], vis=True, vis_r="고문서와 안내 대화가 사건을 가리킨다", steps=2, sol="정주 봉기 단서로 사건을 고른다", dist="adjacent_period_markers", conf=["임술민란", "갑오농민"], exposed=False, page=7),
    dict(n=28, era="opening", sec=[], topic="강화도조약", concepts=["강화도조약", "운요호 사건"], people=[], events=["강화도조약"], inst=[], skill="source_analysis", fmt="source-what", stim=["photo", "dialogue"], vis=True, vis_r="조약 문서 사진이 단서다", steps=2, sol="수교 140년 전시 자료로 조약을 식별한다", dist="adjacent_period_markers", conf=["조·청 상민수륙무역장정", "제물포조약"], exposed=False, page=7),
    dict(n=29, era="opening", sec=[], topic="임오군란", concepts=["임오군란", "제물포조약"], people=[], events=["임오군란"], inst=[], skill="source_analysis", fmt="source-what", stim=["text_source"], vis=False, vis_r="편지 형식 텍스트만으로 사건을 고른다", steps=2, sol="구식 군인·소요 단서로 임오군란을 식별한다", dist="adjacent_period_markers", conf=["갑신정변", "아관파천"], exposed=False, page=7),
    dict(n=30, era="opening", sec=[], topic="통리기무아문", concepts=["통리기무아문", "개화 정책"], people=[], events=[], inst=["통리기무아문"], skill="source_analysis", fmt="policy-content", stim=["photo", "dialogue"], vis=True, vis_r="건물·전시 안내가 기구를 가리킨다", steps=2, sol="개화 기구 단서로 정책을 고른다", dist="same_era_institutions", conf=["통리교섭통상사무아문", "군국기무처"], exposed=False, page=8),
    dict(n=31, era="opening", sec=[], topic="갑오개혁 전후 연표", concepts=["갑오개혁", "신분제 폐지", "태양력"], people=[], events=["갑오개혁"], inst=["군국기무처"], skill="chronology", fmt="chronology-labeled", stim=["timeline", "dialogue", "composite"], vis=True, vis_r="연표 빈칸과 세 인물 대사가 함께 필요하다", steps=3, sol="개혁 단서를 모아 연표 빈 구간을 고른다", dist="order_permutation", conf=["갑신정변", "광무개혁"], exposed=False, page=8),
    dict(n=32, era="opening", sec=["colonial"], topic="을사늑약 체결 배경", concepts=["을사늑약", "보호국"], people=[], events=["을사늑약"], inst=["통감부"], skill="source_analysis", fmt="cause-effect", stim=["text_source"], vis=False, vis_r="조약 조항 텍스트만으로 배경을 고른다", steps=2, sol="조항을 해석해 체결 배경을 고른다", dist="adjacent_period_markers", conf=["러일전쟁", "한일 병합"], exposed=False, page=8),
    dict(n=33, era="colonial", sec=["opening"], topic="국권 피탈 과정 연표", concepts=["을사늑약", "정미7조약", "한일병합"], people=[], events=["국권 피탈"], inst=["통감부"], skill="chronology", fmt="chronology-labeled", stim=["table", "text_source"], vis=True, vis_r="연표 (가)~(마)와 자료를 맞춰야 한다", steps=3, sol="자료 시점을 국권 피탈 연표에 놓는다", dist="order_permutation", conf=["한일의정서", "기유각서"], exposed=False, page=8),
    dict(n=34, era="colonial", sec=[], topic="을사 이후 통감 정치", concepts=["통감부", "을사늑약"], people=[], events=[], inst=["통감부"], skill="situation_issue", fmt="source-what", stim=["dialogue"], vis=False, vis_r="대화만으로 시대상 식별", steps=2, sol="외교권·통감 대화로 시기를 고른다", dist="adjacent_period_markers", conf=["무단 통치", "문화 통치"], exposed=False, page=8),
    dict(n=35, era="colonial", sec=["opening"], topic="국채보상운동", concepts=["국채보상운동", "대한매일신보"], people=[], events=["국채보상운동"], inst=[], skill="source_analysis", fmt="org-activity", stim=["photo", "text_source"], vis=True, vis_r="신문 자료 사진이 운동 식별에 필요하다", steps=2, sol="국채 상환 권고 기사로 운동을 고른다", dist="similar_org_lineage", conf=["독립협회", "신민회"], exposed=False, page=9),
    dict(n=36, era="colonial", sec=[], topic="대한광복회", concepts=["대한광복회", "박상진"], people=["박상진"], events=[], inst=["대한광복회"], skill="source_analysis", fmt="org-activity", stim=["photo", "instructional_text"], vis=True, vis_r="전시 패널이 단체 식별에 필요하다", steps=2, sol="1910년대 국내 비밀결사 단서로 단체를 고른다", dist="similar_org_lineage", conf=["신민회", "의열단", "한인애국단"], exposed=False, page=9),
    dict(n=37, era="colonial", sec=["culture"], topic="나혜석과 근대 여성", concepts=["나혜석", "근대기 미술"], people=["나혜석"], events=[], inst=[], skill="situation_issue", fmt="source-what", stim=["composite", "photo", "instructional_text"], vis=True, vis_r="그림·메신저 화면 등 복합 자료가 인물 상황을 구성한다", steps=2, sol="작품과 유학 단서로 인물 관련 내용을 고른다", dist="same_era_institutions", conf=["최승희", "윤심덕"], exposed=False, page=9),
    dict(n=38, era="colonial", sec=[], topic="조선노동공제회", concepts=["조선노동공제회", "노동 운동"], people=[], events=[], inst=["조선노동공제회"], skill="source_analysis", fmt="org-activity", stim=["table", "instructional_text"], vis=False, vis_r="탐구 보고서 텍스트가 단체의 핵심 단서", steps=2, sol="노동 야학·공제 단서로 단체를 고른다", dist="similar_org_lineage", conf=["조선노농총동맹", "신간회"], exposed=False, page=9),
    dict(n=39, era="colonial", sec=[], topic="광주학생항일운동", concepts=["광주학생항일운동", "신간회"], people=[], events=["광주학생항일운동"], inst=["신간회"], skill="source_analysis", fmt="org-activity", stim=["text_source"], vis=False, vis_r="판결문 텍스트만으로 운동을 식별한다", steps=2, sol="판결 사실로 운동을 식별한 뒤 관련 선지를 고른다", dist="similar_org_lineage", conf=["6·10 만세", "3·1운동"], exposed=False, page=10),
    dict(n=40, era="colonial", sec=[], topic="105인 사건 이후", concepts=["105인 사건", "신민회"], people=[], events=["105인 사건"], inst=["신민회"], skill="chronology", fmt="cause-effect", stim=["instructional_text"], vis=False, vis_r="채팅 UI 텍스트만으로 사건 이후를 판단", steps=2, sol="사건 식별 후 그 이후 조치를 고른다", dist="adjacent_period_markers", conf=["105인 사건 이전 신민회 활동"], exposed=False, page=10),
    dict(n=41, era="colonial", sec=["modern"], topic="방정환과 어린이 운동", concepts=["방정환", "어린이날"], people=["방정환"], events=["어린이날"], inst=["색동회"], skill="source_analysis", fmt="source-who", stim=["photo", "dialogue"], vis=True, vis_r="포스터와 전시 안내가 인물을 가리킨다", steps=2, sol="어린이 운동 단서로 인물을 고른다", dist="same_era_institutions", conf=["이광수", "최남선"], exposed=False, page=10),
    dict(n=42, era="colonial", sec=[], topic="조선어학회", concepts=["조선어학회", "한글 맞춤법 통일안"], people=[], events=["조선어학회 사건"], inst=["조선어학회"], skill="source_analysis", fmt="org-activity", stim=["dialogue", "instructional_text"], vis=False, vis_r="대화 속 활동 서술만으로 단체를 고른다", steps=2, sol="맞춤법·사전 단서로 단체를 고른다", dist="similar_org_lineage", conf=["한글학회 이전 명칭", "조선어연구회"], exposed=False, page=10),
    dict(n=43, era="colonial", sec=[], topic="전시 동원과 황국신민화", concepts=["황국신민서사", "국가총동원"], people=[], events=[], inst=[], skill="situation_issue", fmt="source-what", stim=["text_source"], vis=False, vis_r="일기 형식 문헌만으로 시기를 고른다", steps=2, sol="황국신민화 정책 단서로 시기를 고른다", dist="adjacent_period_markers", conf=["문화 통치", "무단 통치"], exposed=False, page=11),
    dict(n=44, era="colonial", sec=[], topic="한국광복군", concepts=["한국광복군", "임시정부"], people=[], events=[], inst=["한국광복군"], skill="source_analysis", fmt="org-activity", stim=["photo", "dialogue"], vis=True, vis_r="군복·깃발 전시가 조직 식별에 필요하다", steps=2, sol="임정 직할 군사 조직 단서를 고른다", dist="similar_org_lineage", conf=["조선의용대", "한국독립군"], exposed=False, page=11),
    dict(n=45, era="modern", sec=[], topic="제주 4·3", concepts=["제주 4·3"], people=[], events=["제주 4·3"], inst=[], skill="source_analysis", fmt="source-what", stim=["dialogue", "photo"], vis=True, vis_r="구술 영상 장면이 사건 맥락을 제공한다", steps=2, sol="단독정부 반대·진압 단서로 사건을 고른다", dist="adjacent_period_markers", conf=["여수·순천 사건", "한국전쟁"], exposed=False, page=11),
    dict(n=46, era="modern", sec=["colonial"], topic="김구와 남북 협상", concepts=["김구", "남북 협상"], people=["김구"], events=["남북 협상"], inst=["한국독립당"], skill="source_analysis", fmt="source-who", stim=["dialogue"], vis=False, vis_r="세 학생 대사가 인물 활동을 가리킨다", steps=2, sol="임정·협상 단서로 인물을 고른다", dist="same_era_institutions", conf=["이승만", "여운형"], exposed=False, page=11),
    dict(n=47, era="modern", sec=[], topic="1960년대 노동 수출과 개발 독재", concepts=["서독 파견", "경제개발계획"], people=[], events=["서독 광부·간호사 파견"], inst=[], skill="source_analysis", fmt="source-what", stim=["instructional_text"], vis=False, vis_r="신문 기사 텍스트만으로 정부 시기를 고른다", steps=2, sol="노동 수출 기사로 정부 시기를 고른다", dist="adjacent_period_markers", conf=["이승만 시기", "김대중 정부"], exposed=False, page=12),
    dict(n=48, era="modern", sec=[], topic="4·19 혁명", concepts=["4·19 혁명", "3·15 부정선거"], people=[], events=["4·19 혁명"], inst=[], skill="source_analysis", fmt="org-activity", stim=["photo", "dialogue"], vis=True, vis_r="영상·장면 제시가 운동 식별을 돕는다", steps=2, sol="부정선거 항의 장면으로 운동을 고른다", dist="adjacent_period_markers", conf=["5·18", "6월 항쟁"], exposed=False, page=12),
    dict(n=49, era="modern", sec=[], topic="7·4 남북 공동성명", concepts=["7·4 남북 공동성명", "자주·평화·민족 대단결"], people=["박정희"], events=["7·4 남북 공동성명"], inst=[], skill="source_analysis", fmt="policy-content", stim=["dialogue"], vis=False, vis_r="연설 인용만으로 통일 구상을 고른다", steps=2, sol="3원칙 연설로 해당 합의를 고른다", dist="adjacent_period_markers", conf=["6·15 공동선언", "10·4 선언"], exposed=False, page=12),
    dict(n=50, era="culture", sec=["three-kingdoms", "goryeo", "joseon-early"], topic="삼국·고려·조선 군사 제도 비교", concepts=["정용", "광군", "5군영", "속오군"], people=[], events=[], inst=["5군영"], skill="conclusion_evaluation", fmt="king-compare", stim=["instructional_text"], vis=False, vis_r="비교 본문만으로 제도를 판별한다", steps=3, sol="세 시기 군사 제도 서술을 선지와 대조한다", dist="swapped_roles", conf=["9서당", "삼별초", "훈련도감"], exposed=False, page=12),
]


def main() -> None:
    rows = []
    fields = [
        ("primary_era", "era"),
        ("secondary_eras", "sec"),
        ("topic", "topic"),
        ("core_concepts", "concepts"),
        ("people", "people"),
        ("events", "events"),
        ("institutions", "inst"),
        ("official_skill_type_estimate", "skill"),
        ("internal_format_id", "fmt"),
        ("stimulus_types", "stim"),
        ("visual_required", "vis"),
        ("visual_required_reason", "vis_r"),
        ("reasoning_steps", "steps"),
        ("solution_sketch", "sol"),
        ("distractor_strategy", "dist"),
        ("confused_concepts", "conf"),
        ("answer_target_exposed_in_stem", "exposed"),
    ]
    for spec in ITEMS:
        iid = item_id(79, spec["n"])
        for field, key in fields:
            rows.append(
                {
                    "id": iid,
                    "field": field,
                    "value": spec[key],
                    "status": "ai_source_check",
                    "by": BY,
                    "tool": TOOL,
                    "at": NOW,
                    "revision": 1,
                    "replace": False,
                    "note": "제79회 심화 문제지 렌더링 원본 대조. 공식 문장 미수록.",
                }
            )
        rows.append(
            {
                "id": iid,
                "field": "classification_basis",
                "value": f"공식 문제지 {spec['page']}쪽 렌더링 + 공식 정답표",
                "status": "ai_source_check",
                "by": BY,
                "tool": TOOL,
                "at": NOW,
                "revision": 1,
            }
        )
        rows.append(
            {
                "id": iid,
                "field": "uncertainty",
                "value": "low",
                "status": "ai_source_check",
                "by": BY,
                "tool": TOOL,
                "at": NOW,
                "revision": 1,
            }
        )
        rows.append(
            {
                "id": iid,
                "field": "page",
                "value": spec["page"],
                "status": "ai_source_check",
                "by": BY,
                "tool": TOOL,
                "at": NOW,
                "revision": 1,
                "replace": False,
            }
        )
    path = RESEARCH_DIR / "overlays" / "reviews.jsonl"
    from overlays import load_overlays, merge_overlay_records, save_overlays

    merged = merge_overlay_records(load_overlays(path), rows)
    save_overlays(merged, path)
    print(f"merged {len(rows)} overlay rows for {len(ITEMS)} items -> {path} (total {len(merged)})")


if __name__ == "__main__":
    main()
