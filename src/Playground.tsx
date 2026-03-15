import { useState, useMemo, useCallback, useRef, useEffect, memo } from "react";
import { BoltTable, type ColumnType } from "bolt-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { generateMonitors, type Monitor } from "./data";
import {
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  Code2,
  Table2,
  Copy,
  Check,
} from "lucide-react";

const playgroundData = generateMonitors(80);

const PLAYGROUND_COLUMNS: ColumnType<Monitor>[] = [
  { key: "name", dataIndex: "name", title: "Monitor", width: 180, sortable: true, sorter: (a: Monitor, b: Monitor) => a.name.localeCompare(b.name) },
  { key: "status", dataIndex: "status", title: "Status", width: 110, sortable: true, filterable: true, filterFn: (val: string, record: Monitor) => record.status === val.toLowerCase() },
  { key: "region", dataIndex: "region", title: "Region", width: 130, sortable: true },
  { key: "latency", dataIndex: "latency", title: "Latency", width: 100, sortable: true, sorter: (a: Monitor, b: Monitor) => a.latency - b.latency },
  { key: "uptime", dataIndex: "uptime", title: "Uptime", width: 90, sortable: true, sorter: (a: Monitor, b: Monitor) => a.uptime - b.uptime },
  { key: "method", dataIndex: "method", title: "Method", width: 80 },
  { key: "interval", dataIndex: "interval", title: "Interval", width: 80, sortable: true },
  { key: "tags", dataIndex: "tags", title: "Tags", width: 180 },
];

const ALL_COL_KEYS = PLAYGROUND_COLUMNS.map((c) => ({ key: c.key, title: c.title as string }));

// ─── Controls ────────────────────────────────────────────────────────────────

function ColorInput({ label, defaultValue, onChange }: { label: string; defaultValue: string; onChange: (v: string) => void }) {
  const swatchRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLInputElement>(null);
  const sync = (v: string) => { if (swatchRef.current) swatchRef.current.style.backgroundColor = v; if (textRef.current) textRef.current.value = v; onChange(v); };
  return (
    <div className="flex items-center justify-between gap-2">
      <label className="text-xs text-muted-foreground shrink-0">{label}</label>
      <div className="flex items-center gap-1.5">
        <div className="relative">
          <input type="color" defaultValue={defaultValue} onChange={(e) => sync(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
          <div ref={swatchRef} className="w-6 h-6 rounded-md border border-border cursor-pointer" style={{ backgroundColor: defaultValue }} />
        </div>
        <input ref={textRef} type="text" defaultValue={defaultValue} onChange={(e) => sync(e.target.value)} className="w-[80px] h-6 rounded-md border border-border bg-transparent px-1.5 text-[11px] font-mono text-foreground" />
      </div>
    </div>
  );
}

function RangeInput({ label, defaultValue, min, max, step = 1, suffix, onChange }: { label: string; defaultValue: number; min: number; max: number; step?: number; suffix?: string; onChange: (v: number) => void }) {
  const numRef = useRef<HTMLSpanElement>(null);
  return (
    <div className="flex items-center justify-between gap-2">
      <label className="text-xs text-muted-foreground shrink-0">{label}</label>
      <div className="flex items-center gap-1.5">
        <input type="range" min={min} max={max} step={step} defaultValue={defaultValue} onChange={(e) => { const v = Number(e.target.value); if (numRef.current) numRef.current.textContent = `${v}${suffix ?? ""}`; onChange(v); }} className="w-20 h-1 cursor-pointer" />
        <span ref={numRef} className="text-[11px] font-mono text-muted-foreground w-10 text-right tabular-nums">{defaultValue}{suffix}</span>
      </div>
    </div>
  );
}

function Toggle({ label, defaultValue, onChange }: { label: string; defaultValue: boolean; onChange: (v: boolean) => void }) {
  const [on, setOn] = useState(defaultValue);
  return (
    <div className="flex items-center justify-between gap-2">
      <label className="text-xs text-muted-foreground shrink-0">{label}</label>
      <button onClick={() => { const next = !on; setOn(next); onChange(next); }} className={`relative w-8 h-[18px] rounded-full transition-colors cursor-pointer ${on ? "bg-foreground" : "bg-muted-foreground/30"}`}>
        <span className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-background transition-transform ${on ? "left-[16px]" : "left-[2px]"}`} />
      </button>
    </div>
  );
}

function Select({ label, defaultValue, options, onChange }: { label: string; defaultValue: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <label className="text-xs text-muted-foreground shrink-0">{label}</label>
      <select defaultValue={defaultValue} onChange={(e) => onChange(e.target.value)} className="h-6 rounded-md border border-border bg-transparent px-1.5 text-[11px] text-foreground cursor-pointer">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border last:border-b-0">
      <button onClick={() => setOpen(!open)} className="flex items-center justify-between w-full px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-muted/50 transition-colors cursor-pointer">
        {title}
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </button>
      {open && <div className="px-4 pb-3 space-y-2.5">{children}</div>}
    </div>
  );
}

// ─── Memoized table ──────────────────────────────────────────────────────────

interface TableShellProps {
  columns: ColumnType<Monitor>[];
  rowHeight: number;
  accentColor: string;
  autoHeight: boolean;
  pagination: false | { current: number; pageSize: number; total: number };
  onPaginationChange: (page: number, pageSize: number) => void;
  rowSelection?: { type: "checkbox" | "radio"; selectedRowKeys: React.Key[]; onChange: (keys: React.Key[]) => void };
  fullscreen: boolean;
  pinnedBg: string;
  pinnedHeaderBg: string;
}

const TableShell = memo(function TableShell({ columns, rowHeight, accentColor, autoHeight, pagination, onPaginationChange, rowSelection, fullscreen, pinnedBg, pinnedHeaderBg }: TableShellProps) {
  const styles = useMemo(() => {
    const s: Record<string, unknown> = {};
    if (pinnedBg) s.pinnedBg = pinnedBg;
    if (pinnedHeaderBg) s.pinnedHeader = { backgroundColor: pinnedHeaderBg };
    return Object.keys(s).length > 0 ? s : undefined;
  }, [pinnedBg, pinnedHeaderBg]);

  return (
    <BoltTable<Monitor>
      columns={columns}
      data={playgroundData}
      rowKey="id"
      rowHeight={rowHeight}
      accentColor={accentColor}
      autoHeight={fullscreen ? false : autoHeight}
      pagination={pagination}
      onPaginationChange={onPaginationChange}
      rowSelection={rowSelection}
      styles={styles as any}
    />
  );
});

// ─── Code Generator ──────────────────────────────────────────────────────────

interface CodeState {
  accentColor: string;
  rowHeight: number;
  autoHeight: boolean;
  paginationOn: boolean;
  pageSize: number;
  selectionOn: boolean;
  selectionType: string;
  pinnedBg: string;
  pinnedHeaderBg: string;
  css: {
    headerFontSize: number;
    headerFontWeight: string;
    headerBg: string;
    headerColor: string;
    cellFontSize: number;
    cellBg: string;
    cellColor: string;
    rowHoverBg: string;
    rowSelectedBg: string;
  };
}

function generateCode(s: CodeState): string {
  const lines: string[] = [];
  lines.push(`import { BoltTable, ColumnType } from "bolt-table";`);
  lines.push(``);
  lines.push(`const columns: ColumnType<YourData>[] = [`);
  lines.push(`  { key: "name", dataIndex: "name", title: "Name", width: 180 },`);
  lines.push(`  // ... your columns`);
  lines.push(`];`);
  lines.push(``);
  lines.push(`export default function MyTable() {`);

  if (s.selectionOn) {
    lines.push(`  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);`);
    lines.push(``);
  }
  if (s.paginationOn) {
    lines.push(`  const [page, setPage] = useState(1);`);
    lines.push(`  const [pageSize, setPageSize] = useState(${s.pageSize});`);
    lines.push(``);
  }

  lines.push(`  return (`);
  lines.push(`    <BoltTable`);
  lines.push(`      columns={columns}`);
  lines.push(`      data={data}`);
  lines.push(`      rowKey="id"`);

  if (s.rowHeight !== 40) lines.push(`      rowHeight={${s.rowHeight}}`);
  if (s.accentColor !== "#1890ff") lines.push(`      accentColor="${s.accentColor}"`);
  if (!s.autoHeight) lines.push(`      autoHeight={false}`);


  if (s.paginationOn) {
    lines.push(`      pagination={{ current: page, pageSize, total: data.length }}`);
    lines.push(`      onPaginationChange={(p, s) => { setPage(p); setPageSize(s); }}`);
  } else {
    lines.push(`      pagination={false}`);
  }

  if (s.selectionOn) {
    lines.push(`      rowSelection={{`);
    lines.push(`        type: "${s.selectionType}",`);
    lines.push(`        selectedRowKeys: selectedKeys,`);
    lines.push(`        onChange: (keys) => setSelectedKeys(keys),`);
    lines.push(`      }}`);
  }

  // Build styles object
  const styleProps: string[] = [];
  const headerStyle: string[] = [];
  const cellStyle: string[] = [];

  if (s.css.headerFontSize !== 12) headerStyle.push(`fontSize: ${s.css.headerFontSize}`);
  if (s.css.headerFontWeight !== "500") headerStyle.push(`fontWeight: "${s.css.headerFontWeight}"`);
  if (s.css.headerBg) headerStyle.push(`backgroundColor: "${s.css.headerBg}"`);
  if (s.css.headerColor) headerStyle.push(`color: "${s.css.headerColor}"`);

  if (s.css.cellFontSize !== 13) cellStyle.push(`fontSize: ${s.css.cellFontSize}`);
  if (s.css.cellBg) cellStyle.push(`backgroundColor: "${s.css.cellBg}"`);
  if (s.css.cellColor) cellStyle.push(`color: "${s.css.cellColor}"`);

  if (headerStyle.length) styleProps.push(`header: { ${headerStyle.join(", ")} }`);
  if (cellStyle.length) styleProps.push(`cell: { ${cellStyle.join(", ")} }`);
  if (s.css.rowHoverBg) styleProps.push(`rowHover: { backgroundColor: "${s.css.rowHoverBg}" }`);
  if (s.css.rowSelectedBg) styleProps.push(`rowSelected: { backgroundColor: "${s.css.rowSelectedBg}" }`);
  if (s.pinnedBg) styleProps.push(`pinnedBg: "${s.pinnedBg}"`);
  if (s.pinnedHeaderBg) styleProps.push(`pinnedHeader: { backgroundColor: "${s.pinnedHeaderBg}" }`);

  if (styleProps.length) {
    lines.push(`      styles={{`);
    styleProps.forEach((p) => lines.push(`        ${p},`));
    lines.push(`      }}`);
  }

  lines.push(`    />`);
  lines.push(`  );`);
  lines.push(`}`);
  return lines.join("\n");
}

// ─── Playground ──────────────────────────────────────────────────────────────

export default function Playground() {
  const styleRef = useRef<HTMLStyleElement>(null);

  const [accentColor, setAccentColor] = useState("#1890ff");
  const [rowHeight, setRowHeight] = useState(40);
  const [autoHeight, setAutoHeight] = useState(false);
  const [paginationOn, setPaginationOn] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectionOn, setSelectionOn] = useState(false);
  const [selectionType, setSelectionType] = useState<"checkbox" | "radio">("checkbox");
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
  const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>(() => Object.fromEntries(PLAYGROUND_COLUMNS.map((c) => [c.key, true])));
  const [fullscreen, setFullscreen] = useState(false);
  const [pinnedBg, setPinnedBg] = useState("");
  const [pinnedHeaderBg, setPinnedHeaderBg] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);

  const cssVals = useRef({
    headerFontSize: 12, headerFontWeight: "500", headerBg: "", headerColor: "",
    cellFontSize: 13, cellBg: "", cellColor: "",
    rowHoverBg: "", rowSelectedBg: "",
  });

  const flushCSS = useCallback(() => {
    const el = styleRef.current;
    if (!el) return;
    const v = cssVals.current;
    el.textContent = `
      .pg-scope [data-column-key] {
        font-size: ${v.headerFontSize}px !important;
        font-weight: ${v.headerFontWeight} !important;
        ${v.headerBg ? `background-color: ${v.headerBg} !important;` : ""}
        ${v.headerColor ? `color: ${v.headerColor} !important;` : ""}
      }
      .pg-scope [data-row-key] > div > div {
        font-size: ${v.cellFontSize}px !important;
        ${v.cellBg ? `background-color: ${v.cellBg} !important;` : ""}
        ${v.cellColor ? `color: ${v.cellColor} !important;` : ""}
      }
      ${v.rowHoverBg ? `.pg-scope [data-row-key][data-hover] > div { background-color: ${v.rowHoverBg} !important; }` : ""}
      ${v.rowSelectedBg ? `.pg-scope [data-row-key][data-selected] > div { background-color: ${v.rowSelectedBg} !important; }` : ""}
    `;
  }, []);

  const setCSS = useCallback(<K extends keyof typeof cssVals.current>(key: K, value: (typeof cssVals.current)[K]) => {
    cssVals.current[key] = value;
    flushCSS();
  }, [flushCSS]);

  useEffect(() => { flushCSS(); }, [flushCSS]);

  const columns = useMemo(
    () => PLAYGROUND_COLUMNS.filter((c) => visibleCols[c.key] !== false),
    [visibleCols],
  );

  const pagination = useMemo(
    () => (paginationOn ? { current: page, pageSize, total: playgroundData.length } : false as const),
    [paginationOn, page, pageSize],
  );

  const handlePaginationChange = useCallback((p: number, s: number) => { setPage(p); setPageSize(s); }, []);

  const rowSelection = useMemo(
    () => selectionOn ? { type: selectionType, selectedRowKeys: selectedKeys, onChange: setSelectedKeys } : undefined,
    [selectionOn, selectionType, selectedKeys],
  );

  const [resetKey, setResetKey] = useState(0);
  const reset = useCallback(() => {
    setAccentColor("#1890ff"); setRowHeight(40); setAutoHeight(true);
    setPaginationOn(true); setPage(1); setPageSize(10);
    setSelectionOn(false); setSelectionType("checkbox"); setSelectedKeys([]);
    setPinnedBg(""); setPinnedHeaderBg("");
    setVisibleCols(Object.fromEntries(PLAYGROUND_COLUMNS.map((c) => [c.key, true])));
    cssVals.current = { headerFontSize: 12, headerFontWeight: "500", headerBg: "", headerColor: "", cellFontSize: 13, cellBg: "", cellColor: "", rowHoverBg: "", rowSelectedBg: "" };
    flushCSS();
    setResetKey((k) => k + 1);
    setShowCode(false);
  }, [flushCSS]);

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setFullscreen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen]);

  const codeString = useMemo(() => generateCode({
    accentColor, rowHeight, autoHeight,
    paginationOn, pageSize, selectionOn, selectionType,
    pinnedBg, pinnedHeaderBg,
    css: cssVals.current,
  }), [accentColor, rowHeight, autoHeight, paginationOn, pageSize, selectionOn, selectionType, pinnedBg, pinnedHeaderBg, showCode]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(codeString).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [codeString]);

  return (
    <div className={`flex gap-0 rounded-md overflow-hidden border ${fullscreen ? "fixed inset-0 z-[9999] bg-background" : "h-[calc(100vh-200px)] min-h-[500px]"}`}>
      {/* ── Left Panel ───────────────────────────────────────── */}
      <div className="w-[300px] shrink-0 border-r bg-background overflow-y-auto" key={resetKey}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Props</h3>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 px-2 text-muted-foreground" onClick={reset}>
              <RotateCcw size={10} /> Reset
            </Button>
          </div>
        </div>

        <Section title="General">
          <ColorInput label="accentColor" defaultValue="#1890ff" onChange={setAccentColor} />
          <RangeInput label="rowHeight" defaultValue={40} min={28} max={64} suffix="px" onChange={setRowHeight} />
          <Toggle label="autoHeight" defaultValue={false} onChange={setAutoHeight} />
        </Section>

        <Section title="Pagination">
          <Toggle label="Enabled" defaultValue={true} onChange={setPaginationOn} />
          <RangeInput label="pageSize" defaultValue={10} min={5} max={50} step={5} onChange={(v) => { setPageSize(v); setPage(1); }} />
        </Section>

        <Section title="Row Selection">
          <Toggle label="Enabled" defaultValue={false} onChange={setSelectionOn} />
          <Select label="Type" defaultValue="checkbox" options={[{ value: "checkbox", label: "Checkbox" }, { value: "radio", label: "Radio" }]} onChange={(v) => setSelectionType(v as "checkbox" | "radio")} />
        </Section>

        <Section title="Header Styles" defaultOpen={false}>
          <RangeInput label="fontSize" defaultValue={12} min={9} max={18} suffix="px" onChange={(v) => setCSS("headerFontSize", v)} />
          <Select label="fontWeight" defaultValue="500" options={[{ value: "400", label: "Normal" }, { value: "500", label: "Medium" }, { value: "600", label: "Semibold" }, { value: "700", label: "Bold" }]} onChange={(v) => setCSS("headerFontWeight", v)} />
          <ColorInput label="background" defaultValue="#ffffff" onChange={(v) => setCSS("headerBg", v)} />
          <ColorInput label="color" defaultValue="#6b7280" onChange={(v) => setCSS("headerColor", v)} />
        </Section>

        <Section title="Cell Styles" defaultOpen={false}>
          <RangeInput label="fontSize" defaultValue={13} min={10} max={18} suffix="px" onChange={(v) => setCSS("cellFontSize", v)} />
          <ColorInput label="background" defaultValue="#ffffff" onChange={(v) => setCSS("cellBg", v)} />
          <ColorInput label="color" defaultValue="#1f2937" onChange={(v) => setCSS("cellColor", v)} />
        </Section>

        <Section title="Row Styles" defaultOpen={false}>
          <ColorInput label="hoverBg" defaultValue="#f3f4f6" onChange={(v) => setCSS("rowHoverBg", v)} />
          <ColorInput label="selectedBg" defaultValue="#dbeafe" onChange={(v) => setCSS("rowSelectedBg", v)} />
        </Section>

        <Section title="Pinned Styles" defaultOpen={false}>
          <ColorInput label="pinnedBg" defaultValue="#ffffff" onChange={setPinnedBg} />
          <ColorInput label="pinnedHeaderBg" defaultValue="#ffffff" onChange={setPinnedHeaderBg} />
        </Section>

        <Section title="Columns" defaultOpen={false}>
          {ALL_COL_KEYS.map(({ key, title }) => (
            <ColumnToggle key={key} colKey={key} title={title} visibleCols={visibleCols} setVisibleCols={setVisibleCols} />
          ))}
        </Section>
      </div>

      {/* ── Right Panel ──────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            {fullscreen && (
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground" onClick={() => setFullscreen(false)}>
                <Minimize2 size={12} />
              </Button>
            )}
            <span className="text-xs font-semibold text-foreground">{showCode ? "Code" : "Preview"}</span>
            <Badge variant="secondary" className="text-[10px] font-mono">{playgroundData.length} rows</Badge>
            {selectionOn && selectedKeys.length > 0 && <Badge variant="outline" className="text-[10px]">{selectedKeys.length} selected</Badge>}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant={showCode ? "secondary" : "ghost"}
              size="sm"
              className="h-6 text-[10px] gap-1 px-2"
              onClick={() => setShowCode(!showCode)}
            >
              {showCode ? <Table2 size={10} /> : <Code2 size={10} />}
              {showCode ? "Preview" : "Code"}
            </Button>
            {showCode && (
              <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 px-2 text-muted-foreground" onClick={handleCopy}>
                {copied ? <Check size={10} /> : <Copy size={10} />}
                {copied ? "Copied" : "Copy"}
              </Button>
            )}
            {!fullscreen && (
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground" onClick={() => setFullscreen(true)}>
                <Maximize2 size={12} />
              </Button>
            )}
          </div>
        </div>

        <style ref={styleRef} />

        {showCode ? (
          <div className="flex-1 overflow-auto p-4 bg-muted/20">
            <pre className="text-xs font-mono leading-relaxed text-foreground whitespace-pre">
              <code>{codeString}</code>
            </pre>
          </div>
        ) : (
          <div className="pg-scope flex-1 overflow-hidden">
            <TableShell
              columns={columns}
              rowHeight={rowHeight}
              accentColor={accentColor}
              autoHeight={autoHeight}
              pagination={pagination}
              onPaginationChange={handlePaginationChange}
              rowSelection={rowSelection}
              fullscreen={fullscreen}
              pinnedBg={pinnedBg}
              pinnedHeaderBg={pinnedHeaderBg}
            />
          </div>
        )}
      </div>
    </div>
  );
}

const ColumnToggle = memo(function ColumnToggle({ colKey, title, visibleCols, setVisibleCols }: { colKey: string; title: string; visibleCols: Record<string, boolean>; setVisibleCols: React.Dispatch<React.SetStateAction<Record<string, boolean>>> }) {
  const visible = visibleCols[colKey] !== false;
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-muted-foreground">{title}</span>
      <button onClick={() => setVisibleCols((prev) => ({ ...prev, [colKey]: !prev[colKey] }))} className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
        {visible ? <Eye size={14} /> : <EyeOff size={14} />}
      </button>
    </div>
  );
});
