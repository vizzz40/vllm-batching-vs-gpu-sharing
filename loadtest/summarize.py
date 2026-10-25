"""Print a Markdown results table from k6 --summary-export files.

Usage: python loadtest/summarize.py loadtest/results/laptop-vus*.json
"""
import json
import re
import sys

rows = []
for path in sys.argv[1:]:
    with open(path) as f:
        m = json.load(f)["metrics"]
    vus = int(re.search(r"vus(\d+)", path).group(1))
    d = m["http_req_duration"]  # milliseconds
    rows.append((vus, m["gen_tokens"]["rate"], m["iterations"]["count"],
                 d["med"] / 1000, d["p(95)"] / 1000, m["checks"]["fails"]))

print("| VUs | Throughput (tokens/s) | Requests | p50 latency | p95 latency | Failed |")
print("|---:|---:|---:|---:|---:|---:|")
for vus, tps, n, p50, p95, fails in sorted(rows):
    print(f"| {vus} | {tps:,.0f} | {n:,} | {p50:.2f} s | {p95:.2f} s | {fails} |")
