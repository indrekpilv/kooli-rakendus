"""Convert one or more copied school menu blocks into the site's JSON."""

from __future__ import annotations

import json
import re
import sys
from datetime import date, timedelta
from pathlib import Path


DEFAULT_SOURCE = Path("site/data/menu.md")
DEFAULT_OUTPUT = Path("site/data/menu.json")

DAY_NAMES = (
    "Esmaspäev",
    "Teisipäev",
    "Kolmapäev",
    "Neljapäev",
    "Reede",
    "Laupäev",
    "Pühapäev",
)
DAY_OFFSETS = {name.casefold(): index for index, name in enumerate(DAY_NAMES)}
MEAL_NAMES = ("Hommikusöök", "Lõunasöök")

DATE_RANGE_RE = re.compile(
    r"(?P<start_day>\d{1,2})[./](?P<start_month>\d{1,2})"
    r"(?:[./](?P<start_year>\d{4}))?\s*[–—-]\s*"
    r"(?P<end_day>\d{1,2})[./](?P<end_month>\d{1,2})"
    r"(?:[./](?P<end_year>\d{4}))?"
)


def clean_text(value: str) -> str:
    """Normalize text copied from a website or Markdown editor."""
    value = value.replace("\xa0", " ")
    value = value.replace("&nbsp;", " ")
    value = re.sub(r"\\([.*_#()\[\]])", r"\1", value)
    return re.sub(r"\s+", " ", value).strip()


def plain_heading(value: str) -> str:
    """Remove Markdown heading marks from text copied as rendered HTML."""
    value = re.sub(r"^\s*#{1,6}\s*", "", value)
    value = re.sub(r"\s*[:：]\s*$", "", value)
    return clean_text(value)


def find_day(value: str) -> tuple[str, str] | None:
    heading = plain_heading(value)
    folded = heading.casefold()
    for day_name in DAY_NAMES:
        day_folded = day_name.casefold()
        if folded == day_folded:
            return day_name, ""
        if folded.startswith(f"{day_folded} "):
            return day_name, heading[len(day_name):].strip()
    return None


def find_meal(value: str) -> str | None:
    heading = plain_heading(value).casefold()
    for meal_name in MEAL_NAMES:
        if heading == meal_name.casefold():
            return meal_name
    return None


def choose_year(start_month: int, start_day: int, today: date) -> int:
    """Choose the nearest plausible year for a copied range without a year."""
    candidates = []
    for year in (today.year - 1, today.year, today.year + 1):
        try:
            candidate = date(year, start_month, start_day)
        except ValueError:
            continue
        candidates.append((abs((candidate - today).days), year))
    if not candidates:
        raise ValueError("Nädala kuupäev ei ole korrektne.")
    return min(candidates)[1]


def parse_week_range(label: str, today: date | None = None) -> tuple[str | None, str | None]:
    """Return ISO start/end dates from e.g. '07.09 – 11.09'."""
    match = DATE_RANGE_RE.search(label)
    if not match:
        return None, None

    today = today or date.today()
    start_day = int(match.group("start_day"))
    start_month = int(match.group("start_month"))
    end_day = int(match.group("end_day"))
    end_month = int(match.group("end_month"))

    explicit_start_year = match.group("start_year")
    explicit_end_year = match.group("end_year")
    start_year = int(explicit_start_year) if explicit_start_year else choose_year(start_month, start_day, today)
    end_year = int(explicit_end_year) if explicit_end_year else start_year
    if not explicit_end_year and (end_month, end_day) < (start_month, start_day):
        end_year += 1

    try:
        start = date(start_year, start_month, start_day)
        end = date(end_year, end_month, end_day)
    except ValueError as error:
        raise ValueError(f"Vigane nädala kuupäev: {label}") from error

    if end < start:
        raise ValueError(f"Nädala lõpp on enne algust: {label}")
    return start.isoformat(), end.isoformat()


def ensure_week(weeks: list[dict], current_week: dict | None) -> dict:
    if current_week is not None:
        return current_week
    current_week = {
        "weekLabel": "",
        "startDate": None,
        "endDate": None,
        "days": [],
    }
    weeks.append(current_week)
    return current_week


def add_derived_day_dates(weeks: list[dict]) -> None:
    for week in weeks:
        if not week.get("startDate"):
            continue
        start = date.fromisoformat(week["startDate"])
        for day in week["days"]:
            if day.get("date"):
                continue
            offset = DAY_OFFSETS.get(day["day"].casefold())
            if offset is not None:
                day_date = start + timedelta(days=offset)
                day["date"] = day_date.strftime("%d.%m")


def parse_menu(markdown: str) -> dict:
    weeks: list[dict] = []
    current_week: dict | None = None
    current_day: dict | None = None
    current_meal: dict | None = None

    for raw_line in markdown.splitlines():
        line = clean_text(raw_line)
        if not line:
            continue

        title_line = plain_heading(line)
        week_match = re.match(r"^Toitlustamise nädal\s*(.*)$", title_line, re.I)
        if week_match:
            week_label = week_match.group(1).strip()
            start_date, end_date = parse_week_range(week_label)
            current_week = {
                "weekLabel": week_label,
                "startDate": start_date,
                "endDate": end_date,
                "days": [],
            }
            weeks.append(current_week)
            current_day = None
            current_meal = None
            continue

        day = find_day(line)
        if day:
            current_week = ensure_week(weeks, current_week)
            current_day = {
                "day": day[0],
                "date": day[1],
                "meals": [],
            }
            current_week["days"].append(current_day)
            current_meal = None
            continue

        meal = find_meal(line)
        if meal and current_day is not None:
            current_meal = {
                "name": meal,
                "items": [],
            }
            current_day["meals"].append(current_meal)
            continue

        item_match = re.match(r"^(?:[-*+•]\s*|\u2022\s*)(.+)$", line)
        if item_match and current_meal is not None:
            current_meal["items"].append(clean_text(item_match.group(1)))
        elif current_meal is not None and not line.startswith("#"):
            current_meal["items"].append(clean_text(line))

    add_derived_day_dates(weeks)
    weeks = [week for week in weeks if week["days"]]
    return {
        "title": "Nädalamenüü",
        "updated": "Menüüandmed pärinevad failist site/data/menu.md.",
        "demo": False,
        "weeks": weeks,
    }


def main() -> None:
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_SOURCE
    output = Path(sys.argv[2]) if len(sys.argv) > 2 else DEFAULT_OUTPUT

    menu = parse_menu(source.read_text(encoding="utf-8"))
    if not menu["weeks"]:
        raise SystemExit("Menüüst ei leitud ühtegi nädalat ega päeva.")

    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(
        json.dumps(menu, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Koostatud {output}: {len(menu['weeks'])} nädalat")


if __name__ == "__main__":
    main()
