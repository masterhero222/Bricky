#!/usr/bin/env python3
import csv
import datetime as dt
import gzip
import ipaddress
import json
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter, defaultdict
from pathlib import Path


LOG_GLOB = "/var/log/nginx/access.log*"
CACHE_PATH = Path("/var/cache/bricky-traffic/geo.json")
REPORT_DIR = Path("/root")
LOG_PATTERN = re.compile(
    r'^(?P<ip>\S+) \S+ \S+ \[(?P<date>[^\]]+)\] '
    r'"(?P<method>\S+) (?P<url>\S+) [^"]+" (?P<status>\d{3}) \S+ '
    r'"(?P<referrer>[^"]*)" "(?P<agent>[^"]*)"'
)
BOT_PATTERN = re.compile(
    r"bot|crawler|spider|slurp|headless|preview|facebookexternalhit|"
    r"bingpreview|curl|wget|python|go-http-client|uptime|monitor",
    re.IGNORECASE,
)
SCANNER_PATTERN = re.compile(
    r"\.php|\.env|\.git|wp-|wordpress|xmlrpc|cgi-bin|server-status|"
    r"actuator|vendor/|ReportServer|HNAP1|boaform|solr|login\.action",
    re.IGNORECASE,
)
STATIC_PATTERN = re.compile(
    r"^/(api/|assets/|uploads/|src/media_files/|vite\.svg|favicon\.|"
    r"robots\.txt|sitemap\.xml|llms\.txt)|"
    r"\.(css|js|map|png|jpe?g|gif|webp|svg|ico|woff2?|ttf|json|mp4|webm)(\?|$)",
    re.IGNORECASE,
)
APP_PAGE_PATTERN = re.compile(
    r"^/$|^/(about|blog(?:/[^/?]+)?|reset-password|repair-map|client/profile|"
    r"worker/(?:login|register|profile|[^/?]+)|workers(?:/[^/?]+)?|"
    r"worker-preview|requests|admin|auth(?:/(?:login|register|verify-email))?)"
    r"(?:\?|$)",
    re.IGNORECASE,
)


def usage() -> None:
    print("Usage: bricky-traffic DAYS")
    print("Examples: bricky-traffic 1 | bricky-traffic 7 | bricky-traffic 30")


def parse_days() -> int:
    if len(sys.argv) != 2:
        usage()
        raise SystemExit(1)
    try:
        days = int(sys.argv[1])
    except ValueError:
        usage()
        raise SystemExit(1)
    if not 1 <= days <= 90:
        print("DAYS must be between 1 and 90.", file=sys.stderr)
        raise SystemExit(1)
    return days


def iter_log_lines():
    for path in sorted(Path("/var/log/nginx").glob("access.log*")):
        try:
            if path.suffix == ".gz":
                with gzip.open(path, "rt", encoding="utf-8", errors="replace") as handle:
                    yield from handle
            else:
                with path.open("rt", encoding="utf-8", errors="replace") as handle:
                    yield from handle
        except (OSError, EOFError) as error:
            print(f"Warning: skipped {path}: {error}", file=sys.stderr)


def load_cache() -> dict:
    try:
        return json.loads(CACHE_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}


def save_cache(cache: dict) -> None:
    CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    CACHE_PATH.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8")


def locate(ip: str, cache: dict) -> dict:
    if ip in cache:
        return cache[ip]
    try:
        address = ipaddress.ip_address(ip)
        if not address.is_global:
            result = {"country": "Local/server", "city": "-", "isp": "-"}
        else:
            request = urllib.request.Request(
                f"https://ipwho.is/{urllib.parse.quote(ip)}",
                headers={"User-Agent": "BrickyTraffic/1.0"},
            )
            with urllib.request.urlopen(request, timeout=8) as response:
                payload = json.load(response)
            if payload.get("success") is False:
                raise ValueError(payload.get("message", "lookup failed"))
            result = {
                "country": payload.get("country") or "Unknown",
                "city": payload.get("city") or "Unknown",
                "isp": (payload.get("connection") or {}).get("isp") or "Unknown",
            }
    except (ValueError, urllib.error.URLError, TimeoutError, OSError):
        result = {"country": "Lookup unavailable", "city": "-", "isp": "-"}
    cache[ip] = result
    return result


def print_table(title: str, rows: list[tuple], headers: tuple[str, ...]) -> None:
    print(f"\n{title}")
    if not rows:
        print("No data")
        return
    widths = [len(header) for header in headers]
    for row in rows:
        for index, value in enumerate(row):
            widths[index] = max(widths[index], len(str(value)))
    print("  ".join(str(value).ljust(widths[index]) for index, value in enumerate(headers)))
    print("  ".join("-" * width for width in widths))
    for row in rows:
        print("  ".join(str(value).ljust(widths[index]) for index, value in enumerate(row)))


def main() -> None:
    days = parse_days()
    today = dt.datetime.now(dt.timezone.utc).date()
    start = dt.datetime.combine(today - dt.timedelta(days=days - 1), dt.time.min, dt.timezone.utc)
    end = dt.datetime.combine(today + dt.timedelta(days=1), dt.time.min, dt.timezone.utc)

    successful = 0
    bots = 0
    page_views = []
    for line in iter_log_lines():
        match = LOG_PATTERN.match(line)
        if not match:
            continue
        try:
            timestamp = dt.datetime.strptime(
                match.group("date"), "%d/%b/%Y:%H:%M:%S %z"
            ).astimezone(dt.timezone.utc)
        except ValueError:
            continue
        if not start <= timestamp < end:
            continue
        status = int(match.group("status"))
        method = match.group("method")
        if method not in {"GET", "HEAD"} or not 200 <= status < 400:
            continue

        successful += 1
        url = match.group("url")
        agent = match.group("agent")
        is_bot = bool(BOT_PATTERN.search(agent) or SCANNER_PATTERN.search(url))
        if is_bot:
            bots += 1
        is_page = not STATIC_PATTERN.search(url) and bool(APP_PAGE_PATTERN.search(url))
        if not is_bot and is_page:
            page_views.append(
                {
                    "ip": match.group("ip"),
                    "time": timestamp,
                    "url": url.split("?", 1)[0],
                    "referrer": match.group("referrer"),
                }
            )

    grouped = defaultdict(list)
    for view in page_views:
        grouped[view["ip"]].append(view)

    cache = load_cache()
    visitor_rows = []
    for ip, views in sorted(grouped.items(), key=lambda item: len(item[1]), reverse=True):
        geo = locate(ip, cache)
        visitor_rows.append(
            {
                "ip": ip,
                "country": geo["country"],
                "city": geo["city"],
                "page_views": len(views),
                "first_visit_utc": min(view["time"] for view in views).isoformat(),
                "last_visit_utc": max(view["time"] for view in views).isoformat(),
                "isp": geo["isp"],
            }
        )
    save_cache(cache)

    print("\nBRICKY.BG - TRAFFIC REPORT")
    print(f"Period UTC:               {start.date()} to {(end - dt.timedelta(seconds=1)).date()}")
    print(f"Estimated unique visitors: {len(visitor_rows)}")
    print(f"Human page views:          {len(page_views)}")
    print(f"Filtered bot requests:     {bots}")
    print(f"All successful requests:   {successful}")
    print("Unique IP is an estimate, not an exact count of people.")

    countries = Counter(row["country"] for row in visitor_rows)
    cities = Counter(
        f'{row["city"]}, {row["country"]}'
        for row in visitor_rows
        if row["city"] not in {"-", "Unknown"}
    )
    pages = Counter(view["url"] for view in page_views)
    sources = Counter()
    for view in page_views:
        referrer = view["referrer"]
        if not referrer or referrer == "-":
            sources["Direct / unknown"] += 1
        else:
            sources[urllib.parse.urlparse(referrer).hostname or referrer] += 1

    print_table("TOP COUNTRIES", countries.most_common(15), ("Country", "Visitors"))
    print_table("TOP CITIES", cities.most_common(15), ("Location", "Visitors"))
    print_table("TOP PAGES", pages.most_common(15), ("Page", "Views"))
    print_table("TRAFFIC SOURCES", sources.most_common(15), ("Source", "Page views"))

    stamp = dt.datetime.now().strftime("%Y%m%d-%H%M%S")
    report_path = REPORT_DIR / f"bricky-visitors-{days}d-{stamp}.csv"
    with report_path.open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.DictWriter(handle, fieldnames=visitor_rows[0].keys() if visitor_rows else ["ip"])
        writer.writeheader()
        writer.writerows(visitor_rows)
    print(f"\nCSV report: {report_path}")


if __name__ == "__main__":
    main()
