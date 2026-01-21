---
type: dashboard
created: "{{date}}"
updated: "{{date}}"
---

# VibeCoding Operating Console

## 🕒 최근 Iteration 타임라인

```dataviewjs
const P = dv.pages('"VibeCoding/04_Iterations"').where(p => p.type === "iteration");

function toDateTime(v) {
  if (!v) return null;
  if (typeof v === "object" && v.isValid && v.toFormat) return v; // Luxon DateTime
  if (typeof v === "object" && v.toISO) return v; // some dt shapes
  if (typeof v === "string") {
    const dt = dv.date(v);
    return (dt && dt.isValid) ? dt : null;
  }
  if (typeof v === "number") {
    const dt = dv.date(new Date(v));
    return (dt && dt.isValid) ? dt : null;
  }
  return null;
}

function fmt(v) {
  const dt = toDateTime(v);
  return dt ? dt.toFormat("yyyy-LL-dd") : "";
}

const pages = P
  .sort(p => toDateTime(p.updated)?.toMillis?.() ?? 0, 'desc');

dv.table(
  ["File", "Iteration", "Model", "Status", "Summary", "Updated"],
  pages.map(p => [
    dv.fileLink(p.file.path),
    p.iteration ?? "",
    p.model ?? "",
    p.status ?? "",
    p.summary ?? "",
    fmt(p.updated ?? p.file.mtime)
  ])
);
```

## 🤖 모델별 성능 비교

```dataviewjs
const iters = dv.pages('"VibeCoding/04_Iterations"').where(p => p.type === "iteration");

function asNumber(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function asBool(v) {
  if (v === true) return true;
  if (v === false) return false;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (["true","t","yes","y","pass","passed","ok","success","1"].includes(s)) return true;
    if (["false","f","no","n","fail","failed","0"].includes(s)) return false;
  }
  return false;
}

const grouped = iters.groupBy(p => (p.model ?? "UNKNOWN").toString());

function avg(nums) {
  const xs = nums.filter(n => n !== null && n !== undefined);
  if (xs.length === 0) return 0;
  return xs.reduce((a,b) => a+b, 0) / xs.length;
}

dv.table(
  ["Model", "Iterations", "Avg Latency(s)", "Success Rate", "Avg Bugs", "Needs Action"],
  grouped.map(g => {
    const rows = g.rows;
    const count = rows.length || 1;

    const lat = avg(rows.map(r => asNumber(r.latency_sec)));
    const bugs = avg(rows.map(r => asNumber(r.bugs_found)));

    const okCount = rows.filter(r => asBool(r.success)).length;
    const successRate = ((okCount / count) * 100);

    const needs = rows.filter(r => (r.status ?? "").toString() === "needs-action").length;

    return [
      g.key,
      rows.length,
      lat.toFixed(1),
      successRate.toFixed(1) + "%",
      bugs.toFixed(2),
      needs
    ];
  })
);
```

## ⚠ 액션 필요 항목 (status: needs-action)

```dataviewjs
const pending = dv.pages('"VibeCoding"')
  .where(p => (p.status ?? "").toString() === "needs-action");

function toDateTime(v) {
  if (!v) return null;
  if (typeof v === "object" && v.isValid && v.toFormat) return v;
  if (typeof v === "string") {
    const dt = dv.date(v);
    return (dt && dt.isValid) ? dt : null;
  }
  return null;
}

function fmt(v) {
  const dt = toDateTime(v);
  return dt ? dt.toFormat("yyyy-LL-dd") : "";
}

if (!pending || pending.length === 0) {
  dv.paragraph("모든 작업이 정리되어 있어요. ✅");
} else {
  dv.table(
    ["File", "Type", "Status", "Summary", "Updated"],
    pending
      .sort(p => toDateTime(p.updated)?.toMillis?.() ?? 0, 'desc')
      .map(p => [
        dv.fileLink(p.file.path),
        p.type ?? "",
        p.status ?? "",
        p.summary ?? "",
        fmt(p.updated ?? p.file.mtime)
      ])
  );
}
```
