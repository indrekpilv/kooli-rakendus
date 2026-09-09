"""Convert the school's Markdown-like menu into the JSON used by the site."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path


DEFAULT_SOURCE = Path("site/data/menu.md")
DEFAULT_OUTPUT = Path("site/data/menu.json")


def clean_text(value: str) -> str:
    """Normalize text copied from a website or Markdown editor."""
    value = value.replace("\xa0", " ")
    value = value.replace("&nbsp;", " ")
    value = re.sub(r"\\([.*_#()\[\]])", r"\1", value)
    return re.sub(r"\s+", " ", value).strip()


def parse_menu(markdown: str) -> dict:
    title = "Nädalamenüü"
    week_label = ""
    days: list[dict] = []
    current_day: dict | None = None
    current_meal: dict | None = None

    for raw_line in markdown.splitlines():
        line = clean_text(raw_line)
        if not line:
            continue

        week_match = re.match(r"^\s*#?\s*Toitlustamise nädal\s*(.*)$", line, re.I)
        if week_match:
            week_label = week_match.group(1).strip()
            continue

        day_match = re.match(r"^###\s+(.+)$", line)
        if day_match:
            current_day = {
                "day": clean_text(day_match.group(1)),
                "date": "",
                "meals": [],
            }
            days.append(current_day)
            current_meal = None
            continue

        meal_match = re.match(r"^####\s+(.+)$", line)
        if meal_match and current_day is not None:
            current_meal = {
                "name": clean_text(meal_match.group(1)),
                "items": [],
            }
            current_day["meals"].append(current_meal)
            continue

        item_match = re.match(r"^[-*+]\s+(.+)$", line)
        if item_match and current_meal is not None:
            current_meal["items"].append(clean_text(item_match.group(1)))

    return {
        "title": title,
        "weekLabel": week_label,
        "updated": "Menüüandmed pärinevad failist site/data/menu.md.",
        "demo": False,
        "days": days,
    }


def main() -> None:
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_SOURCE
    output = Path(sys.argv[2]) if len(sys.argv) > 2 else DEFAULT_OUTPUT

    menu = parse_menu(source.read_text(encoding="utf-8"))
    if not menu["days"]:
        raise SystemExit("Menüüst ei leitud ühtegi päeva. Kontrolli ### pealkirju.")

    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(
        json.dumps(menu, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Koostatud {output}: {len(menu['days'])} päeva")


if __name__ == "__main__":
    main()
