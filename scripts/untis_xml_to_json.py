#!/usr/bin/env python3
"""Convert an Untis XmlInterface export into the JSON used by the web app."""

from __future__ import annotations

import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path


DEFAULT_SOURCE = Path(__file__).resolve().parents[1] / "data" / "tunniplaan.xml"
DEFAULT_OUTPUT = Path(__file__).resolve().parents[1] / "site" / "data" / "tunniplaan.json"
UNTIS_NAMESPACE = "https://untis.at/untis/XmlInterface"
NS = {"u": UNTIS_NAMESPACE}

WEEKDAYS = {
    1: "Esmaspäev",
    2: "Teisipäev",
    3: "Kolmapäev",
    4: "Neljapäev",
    5: "Reede",
}


def child(parent: ET.Element, name: str) -> ET.Element | None:
    return parent.find(f"u:{name}", NS)


def text(parent: ET.Element | None, name: str, default: str = "") -> str:
    if parent is None:
        return default
    element = child(parent, name)
    if element is None or element.text is None:
        return default
    return element.text.strip()


def int_value(value: str, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def format_time(value: str) -> str:
    digits = re.sub(r"\D", "", value or "")
    if len(digits) == 3:
        digits = f"0{digits}"
    if len(digits) == 4:
        return f"{digits[:2]}:{digits[2:]}"
    return value or ""


def format_date(value: str) -> str:
    digits = re.sub(r"\D", "", value or "")
    if len(digits) == 8:
        return f"{digits[:4]}-{digits[4:6]}-{digits[6:]}"
    return value or ""


def id_tail(identifier: str, prefix: str) -> str:
    if identifier.startswith(prefix):
        return identifier[len(prefix):]
    return identifier


def class_name(identifier: str) -> str:
    value = id_tail(identifier, "CL_").strip()
    match = re.fullmatch(r"(\d+)\s+kl", value, re.IGNORECASE)
    if match:
        return f"{match.group(1)}. klass"
    return value or identifier


def entity_map(parent: ET.Element | None, tag: str, name_tag: str, fallback_prefix: str) -> dict[str, dict[str, str]]:
    result: dict[str, dict[str, str]] = {}
    if parent is None:
        return result

    for element in parent.findall(f"u:{tag}", NS):
        identifier = element.attrib.get("id", "").strip()
        if not identifier:
            continue
        name = text(element, name_tag)
        if not name:
            name = id_tail(identifier, fallback_prefix).strip() or identifier
        result[identifier] = {"id": identifier, "name": name}
    return result


def split_references(value: str, known: dict[str, dict[str, str]]) -> list[str]:
    """Split Untis' space-separated reference list without breaking IDs that contain spaces."""

    remaining = value.strip()
    references: list[str] = []
    known_ids = sorted(known, key=len, reverse=True)

    while remaining:
        remaining = remaining.lstrip()
        match = next(
            (
                identifier
                for identifier in known_ids
                if remaining.startswith(identifier)
                and (len(remaining) == len(identifier) or remaining[len(identifier)] == " ")
            ),
            None,
        )
        if match is None:
            # Keep an unexpected value visible rather than silently dropping it.
            references.append(remaining)
            break
        references.append(match)
        remaining = remaining[len(match):]

    return references


def parse_source(source: Path) -> dict:
    root = ET.parse(source).getroot()
    general = child(root, "general")

    rooms = entity_map(child(root, "rooms"), "room", "longname", "RM_")
    subjects = entity_map(child(root, "subjects"), "subject", "longname", "SU_")
    teachers = entity_map(child(root, "teachers"), "teacher", "surname", "TR_")
    classes = entity_map(child(root, "classes"), "class", "longname", "CL_")

    # Untis stores the actual class label in the element id in this export;
    # the class longname is the class teacher's name. Use the id for display.
    for identifier in classes:
        classes[identifier]["name"] = class_name(identifier)

    periods: list[dict] = []
    timeperiods = child(root, "timeperiods")
    if timeperiods is not None:
        for period in timeperiods.findall("u:timeperiod", NS):
            day = int_value(text(period, "day"))
            period_number = int_value(text(period, "period"))
            if day not in WEEKDAYS or not period_number:
                continue
            periods.append(
                {
                    "day": day,
                    "period": period_number,
                    "start": format_time(text(period, "starttime")),
                    "end": format_time(text(period, "endtime")),
                }
            )

    period_lookup = {(item["day"], item["period"]): item for item in periods}
    lessons: list[dict] = []
    lessons_element = child(root, "lessons")
    if lessons_element is not None:
        for lesson in lessons_element.findall("u:lesson", NS):
            identifier = lesson.attrib.get("id", "").strip()
            subject_ids = [
                reference
                for item in lesson.findall("u:lesson_subject", NS)
                for reference in split_references(item.attrib.get("id", ""), subjects)
            ]
            teacher_ids = [
                reference
                for item in lesson.findall("u:lesson_teacher", NS)
                for reference in split_references(item.attrib.get("id", ""), teachers)
            ]
            class_ids = [
                reference
                for item in lesson.findall("u:lesson_classes", NS)
                for reference in split_references(item.attrib.get("id", ""), classes)
            ]

            # Untis can export unassigned placeholder lessons. They are not
            # useful in a class, teacher or room timetable, so omit them.
            if not identifier or not (subject_ids or teacher_ids or class_ids):
                continue

            slots: list[dict] = []
            times = child(lesson, "times")
            if times is not None:
                for slot in times.findall("u:time", NS):
                    day = int_value(text(slot, "assigned_day"))
                    period_number = int_value(text(slot, "assigned_period"))
                    if day not in WEEKDAYS or not period_number:
                        continue

                    assigned_room = child(slot, "assigned_room")
                    room_ids = split_references(
                        assigned_room.attrib.get("id", "") if assigned_room is not None else "",
                        rooms,
                    )
                    period_data = period_lookup.get((day, period_number), {})
                    slots.append(
                        {
                            "day": day,
                            "dayName": WEEKDAYS[day],
                            "period": period_number,
                            "start": format_time(text(slot, "assigned_starttime")) or period_data.get("start", ""),
                            "end": format_time(text(slot, "assigned_endtime")) or period_data.get("end", ""),
                            "roomIds": room_ids,
                            "room": ", ".join(rooms[item]["name"] for item in room_ids if item in rooms),
                        }
                    )

            if not slots:
                continue

            room_ids = sorted({room_id for slot in slots for room_id in slot["roomIds"]})

            lessons.append(
                {
                    "id": identifier,
                    "subjectIds": subject_ids,
                    "subjects": [subjects[item]["name"] for item in subject_ids if item in subjects],
                    "teacherIds": teacher_ids,
                    "teachers": [teachers[item]["name"] for item in teacher_ids if item in teachers],
                    "classIds": class_ids,
                    "classes": [classes[item]["name"] for item in class_ids if item in classes],
                    "roomIds": room_ids,
                    "rooms": [rooms[item]["name"] for item in room_ids if item in rooms],
                    "periods": int_value(text(lesson, "periods")),
                    "block": int_value(text(lesson, "block")),
                    "effectiveStart": format_date(text(lesson, "effectivebegindate")),
                    "effectiveEnd": format_date(text(lesson, "effectiveenddate")),
                    "occurrence": text(lesson, "occurence"),
                    "slots": slots,
                }
            )

    periods.sort(key=lambda item: (item["day"], item["period"]))
    lessons.sort(key=lambda item: (item["slots"][0]["day"], item["slots"][0]["period"], item["id"]))

    def sorted_entities(items: dict[str, dict[str, str]]) -> list[dict[str, str]]:
        return sorted(items.values(), key=lambda item: (item["name"].casefold(), item["id"]))

    return {
        "title": text(general, "header1", "Kooli tunniplaan"),
        "schoolYear": text(general, "header2"),
        "sourceDate": format_date(root.attrib.get("date", "")),
        "weekdays": [{"number": number, "name": name} for number, name in WEEKDAYS.items()],
        "periods": periods,
        "rooms": sorted_entities(rooms),
        "subjects": sorted_entities(subjects),
        "teachers": sorted_entities(teachers),
        "classes": sorted_entities(classes),
        "lessons": lessons,
    }


def main() -> None:
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_SOURCE
    output = Path(sys.argv[2]) if len(sys.argv) > 2 else DEFAULT_OUTPUT

    if not source.exists():
        raise SystemExit(f"Untise XML-faili ei leitud: {source}")

    timetable = parse_source(source)
    if not timetable["lessons"]:
        raise SystemExit("XML-failist ei leitud ühtegi kasutatavat tunnikirjet.")

    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(timetable, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(
        f"Koostatud {output}: {len(timetable['lessons'])} tundi, "
        f"{len(timetable['classes'])} klassi, {len(timetable['teachers'])} õpetajat, "
        f"{len(timetable['rooms'])} ruumi"
    )


if __name__ == "__main__":
    main()
