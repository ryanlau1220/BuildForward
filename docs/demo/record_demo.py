"""Record the seeded BuildForward walkthrough from a fresh browser context.

Run from the repository root with:
    uv run --no-project --with playwright python docs/demo/record_demo.py

Requires system Chrome, FFmpeg, and FFprobe. No imports or local student files are used.
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
import tempfile
import time
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import expect, sync_playwright


ROOT = Path(__file__).resolve().parents[2]
MP4 = ROOT / "docs/demo/buildforward-demo.mp4"
GIF = ROOT / "apps/web/public/brand/buildforward-demo.gif"


def smooth_scroll(page, top: float, duration_ms: int = 550) -> None:
    page.evaluate(
        """([target, duration]) => new Promise(resolve => {
          const start = window.scrollY;
          const distance = Math.max(0, target) - start;
          const startTime = performance.now();
          function frame(now) {
            const progress = Math.min(1, (now - startTime) / duration);
            const eased = progress * progress * (3 - 2 * progress);
            window.scrollTo(0, start + distance * eased);
            if (progress < 1) requestAnimationFrame(frame);
            else resolve();
          }
          requestAnimationFrame(frame);
        })""",
        [top, duration_ms],
    )


def show_result(page) -> None:
    bottom = page.locator(".result-block").evaluate(
        "element => element.getBoundingClientRect().bottom + window.scrollY"
    )
    smooth_scroll(page, bottom + 20 - 720)


def run_recording(base_url: str, chrome: str, video_dir: Path) -> tuple[Path, float]:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            headless=True,
            executable_path=chrome,
            args=["--no-sandbox"],
        )
        context = browser.new_context(
            viewport={"width": 1280, "height": 720},
            device_scale_factor=1,
            record_video_dir=str(video_dir),
            record_video_size={"width": 1280, "height": 720},
        )
        origin = urlparse(base_url).netloc

        def restrict_requests(route) -> None:
            url = urlparse(route.request.url)
            if url.scheme in {"http", "https"} and url.netloc != origin:
                route.abort()
            else:
                route.continue_()

        context.route("**/*", restrict_requests)
        video_started = time.monotonic()
        page = context.new_page()
        page.goto(base_url, wait_until="networkidle", timeout=30_000)
        expect(page.get_by_role("heading", name="Predicted Skill Gaps at Graduation")).to_be_visible()
        assert page.locator(".workspace-header select").count() == 3
        assert page.locator(".workspace-header select").nth(1).input_value() == "sample-cohort"
        assert page.locator(".workspace-header select").nth(2).input_value() == "sample-record-app"
        assert "Unit Testing" in page.locator(".gap-row").first.inner_text()
        assert "Current skill coverage 18 percent" in page.locator(".gap-row").first.locator(".coverage-track").get_attribute("aria-label")
        assert "19,899" in page.locator(".gap-row").first.inner_text()
        trim_start = max(0, time.monotonic() - video_started - 0.2)
        page.wait_for_timeout(2700)

        page.locator("nav button").first.click()
        expect(page.get_by_role("heading", name="Choose the future module")).to_be_visible()
        module = page.locator(".comparison-panel select")
        module.select_option("testing")
        page.wait_for_timeout(450)
        page.get_by_role("button", name="Run project reuse check").click()
        expect(page.locator(".result-topline .decision-badge")).to_have_text("CONTINUE")
        show_result(page)
        page.wait_for_timeout(2600)

        module.select_option("devops")
        page.wait_for_timeout(500)
        page.get_by_role("button", name="Run project reuse check").click()
        expect(page.locator(".result-topline .decision-badge")).to_have_text("START NEW")
        assert "0%" in page.locator(".result-details").inner_text()
        assert "Unit Testing, Web Api" in page.locator(".result-details").inner_text()
        show_result(page)
        page.wait_for_timeout(2600)

        # Restore the matching reuse result before showing the educator action.
        module.select_option("testing")
        page.get_by_role("button", name="Run project reuse check").click()
        expect(page.locator(".result-topline .decision-badge")).to_have_text("CONTINUE")
        page.locator("nav button").nth(1).click()
        smooth_scroll(page, 0)
        expect(page.locator(".recommendation-card h3")).to_contain_text("Unit Testing")
        page.wait_for_timeout(2500)

        page.locator("#scenario-skill").select_option("unit-testing")
        assert page.locator("#scenario-gain").input_value() == "0.18"
        button = page.get_by_role("button", name="Update forecast scenario")
        button_top = button.evaluate("element => element.getBoundingClientRect().top + window.scrollY")
        smooth_scroll(page, button_top - 500)
        page.wait_for_timeout(400)
        button.click()
        expect(page.locator(".scenario-result .scenario-values")).to_contain_text("30%")
        expect(page.locator(".scenario-result .scenario-values")).to_contain_text("12%")
        result_bottom = page.locator(".scenario-result").evaluate(
            "element => element.getBoundingClientRect().bottom + window.scrollY"
        )
        smooth_scroll(page, result_bottom + 12 - 720)
        page.wait_for_timeout(3200)

        smooth_scroll(page, 0, 650)
        page.get_by_role("button", name="Dismiss message").click()
        page.wait_for_timeout(2300)
        context.close()
        raw_video = Path(page.video.path())
        browser.close()
        return raw_video, trim_start


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", default="https://buildforward.duckdns.org/")
    args = parser.parse_args()
    chrome = shutil.which("google-chrome") or shutil.which("chromium")
    if not chrome or not shutil.which("ffmpeg") or not shutil.which("ffprobe"):
        raise SystemExit("Chrome/Chromium, FFmpeg, and FFprobe are required")
    if urlparse(args.url).scheme != "https":
        raise SystemExit("The demo URL must use HTTPS")

    with tempfile.TemporaryDirectory(prefix="buildforward-demo-") as temp:
        raw, trim_start = run_recording(args.url, chrome, Path(temp))
        subprocess.run(
            ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(raw),
             "-ss", f"{trim_start:.2f}",
             "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
             "-movflags", "+faststart", "-an", str(MP4)],
            check=True,
        )
        subprocess.run(
            ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(MP4),
             "-filter_complex",
             "fps=10,scale=960:-1:flags=lanczos,split[a][b];"
             "[a]palettegen=stats_mode=diff:max_colors=128[p];"
             "[b][p]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle",
             "-loop", "0", str(GIF)],
            check=True,
        )
    print(f"Created {MP4}")
    print(f"Created {GIF}")


if __name__ == "__main__":
    main()
