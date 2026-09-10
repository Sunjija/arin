from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from aggregate import hamilton_apportion, aggregate  # noqa: E402
from common import blank_item, TARGET_ROUNDS  # noqa: E402
from extract import parse_answer_key_text, parse_cover_text  # noqa: E402
from overlays import apply_overlays, merge_overlay_records  # noqa: E402
from validate import (  # noqa: E402
    validate_all,
    validate_answer_sources,
    validate_correction_application,
    validate_cover_link,
    validate_duplicate_files,
    validate_items_for_round,
)


class CoverTests(unittest.TestCase):
    def test_wrong_round_on_cover(self):
        observed = parse_cover_text("제78회 한국사능력검정시험 심화 정답표")
        issues = validate_cover_link(79, "advanced", observed)
        codes = [i["code"] for i in issues]
        self.assertIn("cover_round_mismatch", codes)

    def test_basic_mixed_into_advanced(self):
        observed = parse_cover_text("제79회 한국사능력검정시험 기본 정답표")
        issues = validate_cover_link(79, "advanced", observed)
        self.assertTrue(any(i["code"] == "cover_level_mismatch" for i in issues))

    def test_matching_cover(self):
        observed = parse_cover_text("제79회 한국사능력검정시험 심화 정답표")
        issues = [i for i in validate_cover_link(79, "advanced", observed) if i["severity"] == "error"]
        self.assertEqual(issues, [])


class ItemIntegrityTests(unittest.TestCase):
    def _round_items(self, round_no=79, drop=None, dup=False, points=None):
        items = []
        for n in range(1, 51):
            it = blank_item(round_no, n)
            it["points"] = 2
            it["answer"] = 1
            it["choice_count"] = 5
            items.append(it)
        # 10/30/10
        for i, it in enumerate(items):
            it["points"] = 1 if i < 10 else (3 if i >= 40 else 2)
        if points:
            for it, p in zip(items, points):
                it["points"] = p
        if drop:
            items = [it for it in items if it["number"] not in drop]
        if dup:
            items.append(dict(items[0]))
        return items

    def test_missing_and_duplicate(self):
        issues = validate_items_for_round(self._round_items(drop={7}, dup=True), 79)
        codes = {i["code"] for i in issues}
        self.assertIn("missing_numbers", codes)
        self.assertIn("duplicate_numbers", codes)

    def test_points_sum_error(self):
        items = self._round_items()
        items[0]["points"] = 3
        issues = validate_items_for_round(items, 79)
        self.assertTrue(any(i["code"] == "points_sum" for i in issues))

    def test_complete_100(self):
        issues = [i for i in validate_items_for_round(self._round_items(), 79) if i["severity"] == "error"]
        self.assertEqual(issues, [])


class AnswerSourceTests(unittest.TestCase):
    def test_web_key_mismatch(self):
        web = [{"number": n, "answer": 1, "points": 2} for n in range(1, 51)]
        key = [dict(x) for x in web]
        key[3]["answer"] = 5
        issues = validate_answer_sources(web, key, 70)
        self.assertTrue(any(i["code"] == "answer_source_mismatch" and i["number"] == 4 for i in issues))

    def test_correction_must_be_applied(self):
        items = [blank_item(79, 1)]
        items[0]["answer"] = 2
        items[0]["points"] = 2
        issues = validate_correction_application(
            items, [{"round": 79, "number": 1, "answer": 3, "points": 2, "applied": True}]
        )
        self.assertTrue(any(i["code"] == "correction_not_applied" for i in issues))

    def test_correction_recorded(self):
        items = [blank_item(79, 1)]
        items[0]["answer"] = 3
        items[0]["points"] = 2
        items[0]["answer_corrections"] = [{"notice_url": "https://example.test/notice"}]
        issues = validate_correction_application(
            items, [{"round": 79, "number": 1, "answer": 3, "points": 2, "applied": True}]
        )
        self.assertEqual(issues, [])


class DuplicateFileTests(unittest.TestCase):
    def test_same_hash_two_rounds(self):
        manifest = {
            "rounds": [
                {"round": 79, "paper": {"sha256": "abc"}, "answer_key": {"sha256": "k1"}},
                {"round": 78, "paper": {"sha256": "abc"}, "answer_key": {"sha256": "k2"}},
            ]
        }
        issues = validate_duplicate_files(manifest)
        self.assertTrue(any(i["code"] == "duplicate_file_sha256" for i in issues))


class KeyParseTests(unittest.TestCase):
    def test_circled_and_arabic(self):
        circled = "제79회 심화 정답표\n1 ② 1 2 ④ 1 3 ② 2\n" + " ".join(
            f"{n} ① 2" for n in range(4, 51)
        )
        # adjust first three already set; remaining 4-50 as ①/2 would not sum 100 but parser count matters
        parsed = parse_answer_key_text(circled)
        self.assertGreaterEqual(len(parsed), 3)
        self.assertEqual(parsed[1]["answer"], 2)
        arabic = "제73회 심화 정답표\n" + "\n".join(
            f"{n} {(n % 5)+1} {1 if n<=10 else (3 if n>40 else 2)}" for n in range(1, 51)
        )
        parsed2 = parse_answer_key_text(arabic)
        self.assertEqual(len(parsed2), 50)
        self.assertEqual(sum(v["points"] for v in parsed2.values()), 100)


class DenominatorTests(unittest.TestCase):
    def test_unclassified_not_zero_filled(self):
        items = [blank_item(r, n) for r in TARGET_ROUNDS for n in range(1, 51)]
        dist = aggregate(items)
        block = dist["primary_era"]["full_65_79"]
        self.assertEqual(block["included_items"], 0)
        self.assertIsNone(block["equal_weight"]["share_of_included"])
        self.assertIn("표본이 없어", block["note"] or "")

    def test_multi_label_can_exceed_one(self):
        items = []
        for n in range(1, 4):
            it = blank_item(79, n)
            it["stimulus_types"] = ["map", "text_source"]
            it["review"]["stimulus_types"] = {"status": "auto"}
            items.append(it)
        dist = aggregate(items)
        block = dist["stimulus_types"]["full_65_79"]
        shares = block["equal_weight"]["share_of_included"]
        self.assertIsNotNone(shares)
        self.assertGreater(sum(shares.values()), 1.0)
        self.assertEqual(block["kind"], "multi")


class WeightTests(unittest.TestCase):
    def test_recent_weight_differs_from_equal(self):
        items = []
        # 75-79 (recent 5) all prehistoric; 65-74 all modern
        for rnd in TARGET_ROUNDS:
            for n in range(1, 51):
                it = blank_item(rnd, n)
                it["primary_era"] = "prehistoric" if rnd >= 75 else "modern"
                it["review"]["primary_era"] = {"status": "auto"}
                items.append(it)
        dist = aggregate(items, {"recent_count": 5, "recent_weight": 2.0, "older_weight": 1.0, "rationale": "test"})
        eq = dist["primary_era"]["full_65_79"]["equal_weight"]["share_of_included"]
        wt = dist["primary_era"]["full_65_79"]["recent_weight"]["share_of_included"]
        self.assertAlmostEqual(eq["prehistoric"], 5 / 15, places=5)
        self.assertGreater(wt["prehistoric"], eq["prehistoric"])

    def test_hamilton_50(self):
        alloc = hamilton_apportion({"a": 0.333, "b": 0.333, "c": 0.334}, 50)
        self.assertEqual(sum(alloc.values()), 50)


class OverlayTests(unittest.TestCase):
    def test_rerun_does_not_clobber(self):
        existing = [{"id": "adv-79-01", "field": "primary_era", "value": "prehistoric", "revision": 2, "status": "human"}]
        incoming = [{"id": "adv-79-01", "field": "primary_era", "value": "modern", "revision": 1, "status": "auto"}]
        merged = merge_overlay_records(existing, incoming)
        self.assertEqual(merged[0]["value"], "prehistoric")
        incoming2 = [
            {"id": "adv-79-01", "field": "primary_era", "value": "three-kingdoms", "revision": 3, "status": "human", "replace": True}
        ]
        merged2 = merge_overlay_records(existing, incoming2)
        self.assertEqual(merged2[0]["value"], "three-kingdoms")

    def test_apply_sets_human_flag_only_when_human(self):
        items = [blank_item(79, 1)]
        apply_overlays(items, [{"id": "adv-79-01", "field": "topic", "value": "구석기", "status": "ai_source_check"}])
        self.assertTrue(items[0]["statuses"]["ai_source_checked"])
        self.assertFalse(items[0]["statuses"]["human_reviewed"])


class GitignoreTests(unittest.TestCase):
    def test_local_originals_are_ignored(self):
        repo = Path(__file__).resolve().parents[3]
        import subprocess

        for rel in [
            "var/exam-patterns/downloads/dummy.pdf",
            "var/exam-patterns/ocr/dummy.txt",
            "var/exam-patterns/pages/dummy.png",
            "var/exam-patterns/extracts/dummy-paper.txt",
            "var/exam-patterns/extracts/dummy-bbox.html",
            "var/exam-patterns/extracts/dummy-item-regions.json",
        ]:
            target = repo / rel
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text("x", encoding="utf-8")
            proc = subprocess.run(["git", "check-ignore", "-q", str(target)], cwd=repo)
            self.assertEqual(proc.returncode, 0, f"{rel} should be gitignored")


class CacheReuseTests(unittest.TestCase):
    def test_existing_download_not_refetched(self):
        from collect import download_file

        with tempfile.TemporaryDirectory() as td:
            dest = Path(td) / "file.pdf"
            dest.write_bytes(b"%PDF-fake")
            meta = download_file("https://example.test/never-hit", dest, referer="https://example.test/")
            self.assertTrue(meta["cache_hit"])
            self.assertEqual(meta["bytes"], 9)


class ManifestSafetyTests(unittest.TestCase):
    def test_public_cover_drops_excerpt(self):
        from extract import public_cover

        slim = public_cover(
            {
                "paper": {"round": 77, "level": "advanced", "text_excerpt": "밑줄 그은 생활 모습으로"},
                "answer_key": {"round": 77, "level": "advanced", "text_excerpt": "정답표"},
                "verified": True,
                "mismatch": False,
                "notes": [],
            }
        )
        blob = str(slim)
        self.assertNotIn("text_excerpt", blob)
        self.assertNotIn("밑줄", blob)
        self.assertEqual(slim["paper"]["round"], 77)

    def test_validate_flags_excerpt(self):
        manifest = {
            "rounds": [
                {
                    "round": 79,
                    "cover": {"paper": {"round": 79, "text_excerpt": "생활 모습"}},
                    "paper": {"sha256": "a"},
                    "answer_key": {"sha256": "b"},
                }
            ]
        }
        issues = validate_all([], manifest)
        self.assertTrue(any(i["code"] == "official_excerpt_in_manifest" for i in issues["issues"]))


class RegionSplitTests(unittest.TestCase):
    def test_two_column_invented_html(self):
        from regions import items_from_pages, parse_bbox_pages

        html = """
        <doc>
          <page width="800" height="1000">
            <word xMin="40" yMin="80" xMax="60" yMax="110">1.</word>
            <word xMin="70" yMin="85" xMax="200" yMax="105">청동고양이</word>
            <word xMin="70" yMin="120" xMax="220" yMax="140">유적을소개한다</word>
            <word xMin="420" yMin="80" xMax="440" yMax="110">2.</word>
            <word xMin="450" yMin="85" xMax="600" yMax="105">철기강아지</word>
          </page>
        </doc>
        """
        items = items_from_pages(parse_bbox_pages(html), min_height=14)
        self.assertEqual([it["number"] for it in items], [1, 2])
        self.assertIn("청동고양이", items[0]["text"])
        self.assertNotIn("철기강아지", items[0]["text"])
        self.assertIn("철기강아지", items[1]["text"])
        self.assertEqual(items[0]["page"], 1)
        self.assertEqual(items[0]["column"], 0)
        self.assertEqual(items[1]["column"], 1)

    def test_tsv_question_tokens(self):
        from regions import items_from_pages, parse_tesseract_tsv

        tsv = "level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext\n"
        tsv += "5\t1\t1\t1\t1\t1\t40\t80\t20\t30\t90\t1.\n"
        tsv += "5\t1\t1\t1\t1\t2\t70\t85\t80\t20\t90\t가상사료\n"
        tsv += "5\t1\t1\t1\t2\t1\t420\t80\t20\t30\t90\t2.\n"
        tsv += "5\t1\t1\t1\t2\t2\t450\t85\t80\t20\t90\t가상지도\n"
        page = parse_tesseract_tsv(tsv, 3, image_width=800)
        items = items_from_pages([page], min_height=8)
        self.assertEqual({it["number"] for it in items}, {1, 2})
        self.assertEqual(items[0]["page"], 3)


class OverlayPageTests(unittest.TestCase):
    def test_page_field_goes_to_source(self):
        items = [blank_item(79, 1)]
        apply_overlays(items, [{"id": "adv-79-01", "field": "page", "value": 12, "status": "ai_source_check"}])
        self.assertEqual(items[0]["source"]["page"], 12)
        self.assertTrue(items[0]["statuses"]["ai_source_checked"])

    def test_primary_era_sets_period_block_review(self):
        items = [blank_item(79, 1)]
        apply_overlays(items, [{"id": "adv-79-01", "field": "primary_era", "value": "colonial", "status": "ai_source_check"}])
        self.assertEqual(items[0]["period_block"], "modern")
        self.assertEqual(items[0]["review"]["period_block"]["status"], "ai_source_check")


class ClassifyOverlayGuardTests(unittest.TestCase):
    def test_auto_does_not_replace_ai_era(self):
        from classify import apply_auto_classification

        items = [blank_item(79, 1)]
        apply_overlays(items, [{"id": "adv-79-01", "field": "primary_era", "value": "modern", "status": "ai_source_check"}])
        apply_auto_classification(items, {"adv-79-01": "구석기 뗀석기 주먹도끼 생활 모습으로 옳은 것은?"})
        self.assertEqual(items[0]["primary_era"], "modern")

