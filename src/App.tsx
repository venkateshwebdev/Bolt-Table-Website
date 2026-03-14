import { useState, useMemo, useCallback, useEffect, type ReactNode } from "react";
import {
  BoltTable,
  type ColumnType,
  type SortDirection,
} from "bolt-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { generateMonitors, type Monitor } from "./data";

const allData = generateMonitors(200);

const statusColor: Record<Monitor["status"], string> = {
  active: "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950",
  degraded: "text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-950",
  down: "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950",
  paused: "text-muted-foreground bg-muted",
};

const statusDot: Record<Monitor["status"], string> = {
  active: "bg-emerald-500",
  degraded: "bg-yellow-500",
  down: "bg-red-500",
  paused: "bg-muted-foreground",
};

function formatLatency(ms: number) {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

function StatusCell({ status }: { status: Monitor["status"] }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[status]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${statusDot[status]}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function LatencyBar({ value }: { value: number }) {
  const pct = Math.min(value / 500, 1) * 100;
  const color = value < 100 ? "bg-emerald-500" : value < 300 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground">{formatLatency(value)}</span>
    </div>
  );
}

function UptimeBadge({ value }: { value: number }) {
  const color = value >= 99.9 ? "text-emerald-600" : value >= 99 ? "text-yellow-600" : "text-red-600";
  return <span className={`text-xs font-mono font-medium tabular-nums ${color}`}>{value.toFixed(2)}%</span>;
}

function buildColumns(opts?: { pinActions?: boolean }): ColumnType<Monitor>[] {
  return [
    {
      key: "name",
      dataIndex: "name",
      title: "Monitor",
      width: 180,
      sortable: true,
      sorter: (a: Monitor, b: Monitor) => a.name.localeCompare(b.name),
      render: (_: unknown, record: Monitor) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-foreground truncate">{record.name}</span>
          <span className="text-xs text-muted-foreground truncate">{record.url}</span>
        </div>
      ),
    },
    {
      key: "status",
      dataIndex: "status",
      title: "Status",
      width: 120,
      sortable: true,
      filterable: true,
      filterFn: (val: string, record: Monitor) => record.status === val.toLowerCase(),
      render: (value: unknown) => <StatusCell status={value as Monitor["status"]} />,
    },
    {
      key: "region",
      dataIndex: "region",
      title: "Region",
      width: 140,
      sortable: true,
      render: (value: unknown) => (
        <span className="text-xs font-mono text-muted-foreground">{String(value)}</span>
      ),
    },
    {
      key: "latency",
      dataIndex: "latency",
      title: "Latency",
      width: 160,
      sortable: true,
      sorter: (a: Monitor, b: Monitor) => a.latency - b.latency,
      render: (value: unknown) => <LatencyBar value={value as number} />,
    },
    {
      key: "uptime",
      dataIndex: "uptime",
      title: "Uptime",
      width: 100,
      sortable: true,
      sorter: (a: Monitor, b: Monitor) => a.uptime - b.uptime,
      render: (value: unknown) => <UptimeBadge value={value as number} />,
    },
    {
      key: "method",
      dataIndex: "method",
      title: "Method",
      width: 90,
      render: (value: unknown) => (
        <Badge variant="secondary" className="font-mono text-[10px] px-1.5 py-0">
          {String(value)}
        </Badge>
      ),
    },
    {
      key: "interval",
      dataIndex: "interval",
      title: "Interval",
      width: 90,
      sortable: true,
      render: (value: unknown) => (
        <span className="text-xs text-muted-foreground">{value as number}s</span>
      ),
    },
    {
      key: "lastChecked",
      dataIndex: "lastChecked",
      title: "Last Checked",
      width: 120,
      sortable: true,
      sorter: (a: Monitor, b: Monitor) =>
        new Date(a.lastChecked).getTime() - new Date(b.lastChecked).getTime(),
      render: (value: unknown) => (
        <span className="text-xs text-muted-foreground">{timeAgo(value as string)}</span>
      ),
    },
    {
      key: "tags",
      dataIndex: "tags",
      title: "Tags",
      width: 200,
      sortable: false,
      filterable: false,
      render: (value: unknown) => {
        const tags = value as string[];
        if (!tags?.length) return <span className="text-xs text-muted-foreground">—</span>;
        return (
          <div className="flex gap-1 flex-wrap">
            {tags.map((t) => (
              <Badge key={t} variant="outline" className="text-[10px] px-1.5 py-0">
                {t}
              </Badge>
            ))}
          </div>
        );
      },
    },
    {
      key: "actions",
      dataIndex: "id",
      title: "Actions",
      width: 100,
      sortable: false,
      filterable: false,
      ...(opts?.pinActions ? { pinned: "right" as const } : {}),
      render: () => (
        <Button variant="ghost" size="sm" className="h-6 text-xs px-2">
          Details
        </Button>
      ),
    },
  ];
}

function ExpandedRowContent({ record }: { record: Monitor }) {
  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-foreground">{record.name}</span>
        <StatusCell status={record.status} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <div className="text-xs text-muted-foreground">Endpoint</div>
          <div className="font-mono text-xs truncate">{record.url}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Region</div>
          <div className="font-mono text-xs">{record.region}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">P95 Latency</div>
          <div className="font-mono text-xs">{formatLatency(record.latency)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">30-day Uptime</div>
          <div className="font-mono text-xs">{record.uptime.toFixed(2)}%</div>
        </div>
      </div>
      {record.tags.length > 0 && (
        <div className="flex gap-1">
          {record.tags.map((t) => (
            <Badge key={t} variant="outline" className="text-[10px]">
              {t}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-1">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="rounded-lg border bg-muted/50 p-4 text-xs overflow-x-auto font-mono leading-relaxed">
      <code>{children}</code>
    </pre>
  );
}

function ExampleSection({
  title,
  description,
  code,
  toolbar,
  children,
}: {
  title: string;
  description: string;
  code: string;
  toolbar?: ReactNode;
  children: ReactNode;
}) {
  const [showCode, setShowCode] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <SectionHeader title={title} description={description} />
        <Button
          variant={showCode ? "secondary" : "outline"}
          size="sm"
          className="shrink-0 text-xs gap-1.5 mt-1"
          onClick={() => setShowCode(!showCode)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
          {showCode ? "Hide Code" : "View Code"}
        </Button>
      </div>
      {toolbar}
      {showCode && <CodeBlock>{code}</CodeBlock>}
      {children}
    </div>
  );
}

// ─── Shared code preamble for "View Code" snippets ──────────────────────────

const CODE_IMPORTS = `import { BoltTable, ColumnType } from "bolt-table";`;

const CODE_TYPES = `interface Monitor {
  id: string;
  name: string;
  url: string;
  status: "active" | "degraded" | "down" | "paused";
  region: string;
  latency: number;
  uptime: number;
  lastChecked: string;
  method: string;
  interval: number;
  tags: string[];
}`;

const CODE_COLUMNS = `const columns: ColumnType<Monitor>[] = [
  { key: "name",        dataIndex: "name",        title: "Monitor",      width: 180, sortable: true },
  { key: "status",      dataIndex: "status",      title: "Status",       width: 120, sortable: true, filterable: true },
  { key: "region",      dataIndex: "region",      title: "Region",       width: 140, sortable: true },
  { key: "latency",     dataIndex: "latency",     title: "Latency",      width: 160, sortable: true },
  { key: "uptime",      dataIndex: "uptime",      title: "Uptime",       width: 100, sortable: true },
  { key: "method",      dataIndex: "method",      title: "Method",       width: 90 },
  { key: "interval",    dataIndex: "interval",    title: "Interval",     width: 90,  sortable: true },
  { key: "lastChecked", dataIndex: "lastChecked", title: "Last Checked", width: 120, sortable: true },
  { key: "tags",        dataIndex: "tags",        title: "Tags",         width: 200 },
  { key: "actions",     dataIndex: "id",          title: "Actions",      width: 100 },
];`;

const CODE_DATA = `const data: Monitor[] = [ /* your data array */ ];`;

function fullCode(body: string) {
  return `${CODE_IMPORTS}\n\n${CODE_TYPES}\n\n${CODE_COLUMNS}\n\n${CODE_DATA}\n\nexport default function Example() {\n${body}\n}`;
}

// ─── Examples ────────────────────────────────────────────────────────────────

function BasicExample() {
  const columns = useMemo(() => buildColumns(), []);
  const data = useMemo(() => allData.slice(0, 50), []);

  return (
    <ExampleSection
      title="Basic Table"
      description="A simple table with sorting, filtering, column reordering (drag headers), column resizing (drag edges), and right-click context menu. Try it out."
      code={fullCode(`  return (
    <BoltTable<Monitor>
      columns={columns}
      data={data}
      rowKey="id"
      rowHeight={48}
      pagination={{ pageSize: 10 }}
    />
  );`)}
    >
      <div className="rounded-lg border overflow-hidden">
        <BoltTable<Monitor>
          columns={columns}
          autoHeight
          data={data}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          rowHeight={48}
          classNames={{
            header: "text-xs font-medium text-muted-foreground",
            cell: "text-sm",
          }}
          styles={{
            rowHover: { backgroundColor: "var(--color-muted)" },
            pinnedBg: "var(--color-background)",
          }}
        />
      </div>
    </ExampleSection>
  );
}

function PaginationExample() {
  const columns = useMemo(() => buildColumns(), []);
  const data = useMemo(() => allData.slice(0, 100), []);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  return (
    <ExampleSection
      title="Pagination"
      description="Client-side pagination with configurable page size. BoltTable slices the data automatically."
      code={fullCode(`  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  return (
    <BoltTable<Monitor>
      columns={columns}
      data={data}       // pass ALL data — BoltTable slices it
      rowKey="id"
      rowHeight={48}
      pagination={{ current: page, pageSize, total: data.length }}
      onPaginationChange={(p, s) => {
        setPage(p);
        setPageSize(s);
      }}
    />
  );`)}
    >
      <div className="rounded-lg border overflow-hidden">
        <BoltTable<Monitor>
          columns={columns}
          data={data}
          rowKey="id"
          rowHeight={48}
          pagination={{ current: page, pageSize, total: data.length }}
          onPaginationChange={(p, s) => {
            setPage(p);
            setPageSize(s);
          }}
          classNames={{
            header: "text-xs font-medium text-muted-foreground",
            cell: "text-sm",
          }}
          styles={{
            rowHover: { backgroundColor: "var(--color-muted)" },
            pinnedBg: "var(--color-background)",
          }}
        />
      </div>
    </ExampleSection>
  );
}

function SelectionExample() {
  const columns = useMemo(() => buildColumns(), []);
  const data = useMemo(() => allData.slice(0, 30), []);
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);

  return (
    <ExampleSection
      title="Row Selection"
      description="Checkbox selection with select-all, indeterminate state, and controlled selection. Supports radio mode too."
      code={fullCode(`  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);

  return (
    <BoltTable<Monitor>
      columns={columns}
      data={data}
      rowKey="id"
      rowHeight={48}
      pagination={{ pageSize: 10 }}
      rowSelection={{
        type: "checkbox",  // or "radio"
        selectedRowKeys: selectedKeys,
        onChange: (keys) => setSelectedKeys(keys),
        getCheckboxProps: (record) => ({
          disabled: record.status === "locked",
        }),
      }}
    />
  );`)}
      toolbar={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{selectedKeys.length} of {data.length} selected</span>
          {selectedKeys.length > 0 && (
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setSelectedKeys([])}>
              Clear
            </Button>
          )}
        </div>
      }
    >
      <div className="rounded-lg border overflow-hidden">
        <BoltTable<Monitor>
          columns={columns}
          data={data}
          rowKey="id"
          rowHeight={48}
          pagination={{ pageSize: 10 }}
          rowSelection={{
            type: "checkbox",
            selectedRowKeys: selectedKeys,
            onChange: (keys) => setSelectedKeys(keys),
          }}
          classNames={{
            header: "text-xs font-medium text-muted-foreground",
            cell: "text-sm",
          }}
          styles={{
            rowHover: { backgroundColor: "var(--color-muted)" },
            pinnedBg: "var(--color-background)",
          }}
        />
      </div>
    </ExampleSection>
  );
}

function ExpandableExample() {
  const columns = useMemo(() => buildColumns(), []);
  const data = useMemo(() => allData.slice(0, 20), []);

  return (
    <ExampleSection
      title="Expandable Rows"
      description="Click the chevron to expand a row and see detailed information. Content height is auto-measured by ResizeObserver."
      code={fullCode(`  return (
    <BoltTable<Monitor>
      columns={columns}
      data={data}
      rowKey="id"
      rowHeight={48}
      pagination={{ pageSize: 10 }}
      expandable={{
        rowExpandable: (record) => record.status !== "paused",
        expandedRowRender: (record) => (
          <div style={{ padding: 16 }}>
            <h4>{record.name} — Details</h4>
            <p>Region: {record.region}</p>
            <p>Latency: {record.latency}ms</p>
            <p>Uptime: {record.uptime}%</p>
          </div>
        ),
      }}
      expandedRowHeight={150}
      maxExpandedRowHeight={400}
    />
  );`)}
    >
      <div className="rounded-lg border overflow-hidden">
        <BoltTable<Monitor>
          columns={columns}
          data={data}
          rowKey="id"
          rowHeight={48}
          pagination={{ pageSize: 10 }}
          expandable={{
            rowExpandable: () => true,
            expandedRowRender: (record: Monitor) => <ExpandedRowContent record={record} />,
          }}
          classNames={{
            header: "text-xs font-medium text-muted-foreground",
            cell: "text-sm",
            expandedRow: "bg-muted/30",
          }}
          styles={{
            rowHover: { backgroundColor: "var(--color-muted)" },
            pinnedBg: "var(--color-background)",
          }}
        />
      </div>
    </ExampleSection>
  );
}

function PinningExample() {
  const columns = useMemo(() => buildColumns({ pinActions: true }), []);
  const data = useMemo(() => allData.slice(0, 30), []);

  return (
    <ExampleSection
      title="Column Pinning"
      description='The "Actions" column is pinned to the right. Right-click any header to pin/unpin columns. Scroll horizontally to see the sticky effect.'
      code={`${CODE_IMPORTS}\n\n${CODE_TYPES}\n\nconst columns: ColumnType<Monitor>[] = [
  { key: "name",    dataIndex: "name",    title: "Name",    width: 180, pinned: "left" },
  { key: "status",  dataIndex: "status",  title: "Status",  width: 120 },
  { key: "region",  dataIndex: "region",  title: "Region",  width: 140 },
  // ... more columns ...
  { key: "actions", dataIndex: "id",      title: "Actions", width: 100, pinned: "right" },
];

${CODE_DATA}

export default function Example() {
  return (
    <BoltTable<Monitor>
      columns={columns}
      data={data}
      rowKey="id"
      rowHeight={48}
      pagination={{ pageSize: 10 }}
      styles={{ pinnedBg: "var(--color-background)" }}
      onColumnPin={(key, pinned) => console.log(key, pinned)}
    />
  );
}`}
    >
      <div className="rounded-lg border overflow-hidden">
        <BoltTable<Monitor>
          columns={columns}
          data={data}
          rowKey="id"
          rowHeight={48}
          pagination={{ pageSize: 10 }}
          classNames={{
            header: "text-xs font-medium text-muted-foreground",
            cell: "text-sm",
          }}
          styles={{
            rowHover: { backgroundColor: "var(--color-muted)" },
            pinnedBg: "var(--color-background)",
          }}
        />
      </div>
    </ExampleSection>
  );
}

function LoadingExample() {
  const columns = useMemo(() => buildColumns(), []);
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<Monitor[]>([]);

  const simulateLoad = useCallback(() => {
    setIsLoading(true);
    setData([]);
    setTimeout(() => {
      setData(allData.slice(0, 20));
      setIsLoading(false);
    }, 2500);
  }, []);

  useEffect(() => {
    simulateLoad();
  }, [simulateLoad]);

  return (
    <ExampleSection
      title="Loading / Shimmer"
      description="Animated skeleton rows while data is loading. Click reload to see it again."
      code={fullCode(`  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<Monitor[]>([]);

  useEffect(() => {
    setIsLoading(true);
    fetchData().then((rows) => {
      setData(rows);
      setIsLoading(false);
    });
  }, []);

  return (
    <BoltTable<Monitor>
      columns={columns}
      data={data}
      rowKey="id"
      rowHeight={48}
      isLoading={isLoading}
      pagination={{ pageSize: 10 }}
    />
  );`)}
      toolbar={
        <Button variant="outline" size="sm" onClick={simulateLoad} disabled={isLoading}>
          {isLoading ? "Loading..." : "Reload Data"}
        </Button>
      }
    >
      <div className="rounded-lg border overflow-hidden">
        <BoltTable<Monitor>
          columns={columns}
          data={data}
          rowKey="id"
          rowHeight={48}
          isLoading={isLoading}
          pagination={{ pageSize: 10 }}
          classNames={{
            header: "text-xs font-medium text-muted-foreground",
            cell: "text-sm",
          }}
          styles={{
            rowHover: { backgroundColor: "var(--color-muted)" },
            pinnedBg: "var(--color-background)",
          }}
        />
      </div>
    </ExampleSection>
  );
}

function InfiniteScrollExample() {
  const columns = useMemo(() => buildColumns(), []);
  const [data, setData] = useState<Monitor[]>(() => allData.slice(0, 20));
  const [loading, setLoading] = useState(false);
  const total = 200;

  const loadMore = useCallback(() => {
    if (loading || data.length >= total) return;
    setLoading(true);
    setTimeout(() => {
      setData((prev) => allData.slice(0, prev.length + 20));
      setLoading(false);
    }, 1500);
  }, [loading, data.length]);

  return (
    <ExampleSection
      title="Infinite Scroll"
      description="Scroll to the bottom to load more rows. Shimmer rows appear at the bottom while loading."
      code={fullCode(`  const [data, setData] = useState<Monitor[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadMore = async () => {
    setIsLoading(true);
    const newRows = await fetchNextPage();
    setData((prev) => [...prev, ...newRows]);
    setIsLoading(false);
  };

  return (
    <BoltTable<Monitor>
      columns={columns}
      data={data}
      rowKey="id"
      rowHeight={48}
      isLoading={isLoading}
      onEndReached={loadMore}
      onEndReachedThreshold={5}
      pagination={false}
      autoHeight={false}
    />
  );`)}
      toolbar={
        <p className="text-xs text-muted-foreground">
          Loaded {data.length} of {total} rows
        </p>
      }
    >
      <div className="rounded-lg border overflow-hidden h-[480px]">
        <BoltTable<Monitor>
          columns={columns}
          data={data}
          rowKey="id"
          rowHeight={48}
          isLoading={loading}
          onEndReached={loadMore}
          onEndReachedThreshold={5}
          pagination={false}
          autoHeight={false}
          classNames={{
            header: "text-xs font-medium text-muted-foreground",
            cell: "text-sm",
          }}
          styles={{
            rowHover: { backgroundColor: "var(--color-muted)" },
            pinnedBg: "var(--color-background)",
          }}
        />
      </div>
    </ExampleSection>
  );
}

function VirtualizationExample() {
  const columns = useMemo(() => buildColumns(), []);
  const largeData = useMemo(() => generateMonitors(10000), []);

  return (
    <ExampleSection
      title="10,000 Rows — Virtualized"
      description="All 10,000 rows rendered with virtualization. Only the visible rows are in the DOM. Scroll is buttery smooth."
      code={fullCode(`  const largeData = generateData(10_000);

  return (
    <BoltTable<Monitor>
      columns={columns}
      data={largeData}
      rowKey="id"
      rowHeight={48}
      pagination={false}
      autoHeight={false}
    />
  );`)}
    >
      <div className="rounded-lg border overflow-hidden h-[480px]">
        <BoltTable<Monitor>
          columns={columns}
          data={largeData}
          rowKey="id"
          rowHeight={48}
          pagination={false}
          autoHeight={false}
          classNames={{
            header: "text-xs font-medium text-muted-foreground",
            cell: "text-sm",
          }}
          styles={{
            rowHover: { backgroundColor: "var(--color-muted)" },
            pinnedBg: "var(--color-background)",
          }}
        />
      </div>
    </ExampleSection>
  );
}

function StylingExample() {
  const columns = useMemo(() => buildColumns(), []);
  const data = useMemo(() => allData.slice(0, 20), []);

  return (
    <ExampleSection
      title="Custom Accent Color"
      description="Use the accentColor prop to theme interactive elements — sort indicators, filter icons, resize line, selected rows, and pagination."
      code={fullCode(`  return (
    <BoltTable<Monitor>
      columns={columns}
      data={data}
      rowKey="id"
      rowHeight={48}
      accentColor="#8b5cf6"
      pagination={{ pageSize: 10 }}
      classNames={{
        header: "text-xs uppercase tracking-wider",
        cell: "text-sm",
        pinnedHeader: "border-r border-indigo-200",
      }}
      styles={{
        rowHover: { backgroundColor: "#f0f9ff" },
        rowSelected: { backgroundColor: "#e0e7ff" },
        pinnedBg: "rgba(238, 242, 255, 0.95)",
      }}
    />
  );`)}
    >
      <div className="rounded-lg border overflow-hidden">
        <BoltTable<Monitor>
          columns={columns}
          data={data}
          rowKey="id"
          rowHeight={48}
          accentColor="#8b5cf6"
          pagination={{ pageSize: 10 }}
          classNames={{
            header: "text-xs font-medium text-muted-foreground",
            cell: "text-sm",
          }}
          styles={{
            rowHover: { backgroundColor: "var(--color-muted)" },
            pinnedBg: "var(--color-background)",
          }}
        />
      </div>
    </ExampleSection>
  );
}

function EmptyStateExample() {
  const columns = useMemo(() => buildColumns(), []);

  return (
    <ExampleSection
      title="Empty State"
      description="Custom empty renderer when there is no data to display."
      code={fullCode(`  return (
    <BoltTable<Monitor>
      columns={columns}
      data={[]}
      rowKey="id"
      rowHeight={48}
      emptyRenderer={
        <div className="flex flex-col items-center gap-3 py-12">
          <SearchXIcon className="h-8 w-8 opacity-40" />
          <p className="text-sm font-medium">No monitors found</p>
          <p className="text-xs">Try adjusting your filters.</p>
        </div>
      }
    />
  );`)}
    >
      <div className="rounded-lg border overflow-hidden">
        <BoltTable<Monitor>
          columns={columns}
          data={[]}
          rowKey="id"
          rowHeight={48}
          pagination={{ pageSize: 10 }}
          emptyRenderer={
            <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-40">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
                <path d="M8 11h6" />
              </svg>
              <div className="text-center">
                <p className="text-sm font-medium">No monitors found</p>
                <p className="text-xs mt-1">Try adjusting your filters or add a new monitor.</p>
              </div>
            </div>
          }
          classNames={{
            header: "text-xs font-medium text-muted-foreground",
            cell: "text-sm",
          }}
          styles={{
            rowHover: { backgroundColor: "var(--color-muted)" },
            pinnedBg: "var(--color-background)",
          }}
        />
      </div>
    </ExampleSection>
  );
}

function ServerSideExample() {
  const columns = useMemo(() => buildColumns(), []);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortKey, setSortKey] = useState("");
  const [sortDir, setSortDir] = useState<SortDirection>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Monitor[]>([]);
  const [total, setTotal] = useState(0);

  const fetchData = useCallback(
    (p: number, ps: number, sk: string, sd: SortDirection, f: Record<string, string>) => {
      setLoading(true);
      setTimeout(() => {
        let result = [...allData];

        Object.entries(f).forEach(([key, val]) => {
          if (val) {
            result = result.filter((row) => {
              const cell = String(row[key as keyof Monitor] ?? "").toLowerCase();
              return cell.includes(val.toLowerCase());
            });
          }
        });

        if (sk && sd) {
          result.sort((a, b) => {
            const av = a[sk as keyof Monitor];
            const bv = b[sk as keyof Monitor];
            if (typeof av === "number" && typeof bv === "number") return sd === "asc" ? av - bv : bv - av;
            return sd === "asc"
              ? String(av).localeCompare(String(bv))
              : String(bv).localeCompare(String(av));
          });
        }

        setTotal(result.length);
        const start = (p - 1) * ps;
        setData(result.slice(start, start + ps));
        setLoading(false);
      }, 600);
    },
    [],
  );

  useEffect(() => {
    fetchData(page, pageSize, sortKey, sortDir, filters);
  }, [page, pageSize, sortKey, sortDir, filters, fetchData]);

  return (
    <ExampleSection
      title="Server-Side Operations"
      description="Sort, filter, and paginate callbacks delegate to your server. This simulates a 600ms API delay."
      code={fullCode(`  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Monitor[]>([]);
  const [total, setTotal] = useState(0);

  const fetchPage = async (p: number, s: number) => {
    setLoading(true);
    const res = await api.getMonitors({ page: p, pageSize: s });
    setData(res.rows);
    setTotal(res.total);
    setLoading(false);
  };

  return (
    <BoltTable<Monitor>
      columns={columns}
      data={data}           // only current page from server
      rowKey="id"
      rowHeight={48}
      isLoading={loading}
      pagination={{ current: page, pageSize, total }}
      onPaginationChange={(p, s) => { setPage(p); setPageSize(s); }}
      onSortChange={(key, dir) => {
        fetchPage(1, pageSize);  // re-fetch sorted
      }}
      onFilterChange={(filters) => {
        fetchPage(1, pageSize);  // re-fetch filtered
      }}
    />
  );`)}
      toolbar={
        Object.keys(filters).length > 0 ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            Active filters:
            {Object.entries(filters).map(([k, v]) => (
              <Badge key={k} variant="secondary" className="text-[10px]">
                {k}: {v}
              </Badge>
            ))}
          </div>
        ) : undefined
      }
    >
      <div className="rounded-lg border overflow-hidden">
        <BoltTable<Monitor>
          columns={columns}
          data={data}
          rowKey="id"
          rowHeight={48}
          isLoading={loading}
          pagination={{ current: page, pageSize, total }}
          onPaginationChange={(p, s) => {
            setPage(p);
            setPageSize(s);
          }}
          onSortChange={(key, dir) => {
            setSortKey(key);
            setSortDir(dir);
            setPage(1);
          }}
          onFilterChange={(f) => {
            setFilters(f);
            setPage(1);
          }}
          classNames={{
            header: "text-xs font-medium text-muted-foreground",
            cell: "text-sm",
          }}
          styles={{
            rowHover: { backgroundColor: "var(--color-muted)" },
            pinnedBg: "var(--color-background)",
          }}
        />
      </div>
    </ExampleSection>
  );
}

function CombinedExample() {
  const columns = useMemo(() => buildColumns({ pinActions: true }), []);
  const data = useMemo(() => allData.slice(0, 50), []);
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);

  return (
    <ExampleSection
      title="Full Featured"
      description="Selection + expandable rows + pinned columns + pagination — all combined."
      code={fullCode(`  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);

  // Pin "actions" column to the right
  const cols = columns.map((c) =>
    c.key === "actions" ? { ...c, pinned: "right" as const } : c
  );

  return (
    <BoltTable<Monitor>
      columns={cols}
      data={data}
      rowKey="id"
      rowHeight={48}
      pagination={{ pageSize: 15 }}
      rowSelection={{
        type: "checkbox",
        selectedRowKeys: selectedKeys,
        onChange: (keys) => setSelectedKeys(keys),
      }}
      expandable={{
        rowExpandable: () => true,
        expandedRowRender: (record) => (
          <div>
            <h4>{record.name}</h4>
            <p>{record.region} — {record.latency}ms — {record.uptime}%</p>
          </div>
        ),
      }}
      styles={{ pinnedBg: "var(--color-background)" }}
      onColumnResize={(key, width) => console.log(key, width)}
      onColumnOrderChange={(order) => console.log(order)}
      onColumnPin={(key, pinned) => console.log(key, pinned)}
    />
  );`)}
      toolbar={
        selectedKeys.length > 0 ? (
          <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-sm">
            <span className="font-medium">{selectedKeys.length} selected</span>
            <Separator orientation="vertical" className="h-4" />
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setSelectedKeys([])}>
              Deselect all
            </Button>
          </div>
        ) : undefined
      }
    >
      <div className="rounded-lg border overflow-hidden">
        <BoltTable<Monitor>
          columns={columns}
          data={data}
          rowKey="id"
          rowHeight={48}
          pagination={{ pageSize: 15 }}
          rowSelection={{
            type: "checkbox",
            selectedRowKeys: selectedKeys,
            onChange: (keys) => setSelectedKeys(keys),
          }}
          expandable={{
            rowExpandable: () => true,
            expandedRowRender: (record: Monitor) => <ExpandedRowContent record={record} />,
          }}
          classNames={{
            header: "text-xs font-medium text-muted-foreground",
            cell: "text-sm",
            expandedRow: "bg-muted/30",
          }}
          styles={{
            rowHover: { backgroundColor: "var(--color-muted)" },
            pinnedBg: "var(--color-background)",
          }}
        />
      </div>
    </ExampleSection>
  );
}

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-lg">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 h-14">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-foreground">
                <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
              <span className="font-semibold text-foreground tracking-tight">bolt-table</span>
            </div>
            <Badge variant="secondary" className="text-[10px] font-mono">
              npm
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <a href="https://www.npmjs.com/package/bolt-table" target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="sm" className="text-xs">
                npm
              </Button>
            </a>
            <a href="https://github.com/venkateshwebdev/Bolt-Table" target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="sm" className="text-xs">
                GitHub
              </Button>
            </a>
            <Separator orientation="vertical" className="h-4" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDark(!isDark)}
              className="h-8 w-8 p-0"
            >
              {isDark ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                </svg>
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <section className="space-y-4 pb-12">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              bolt-table
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              A high-performance, virtualized React table. Only visible rows are in the DOM — handles any dataset size. Sort, filter, pin, resize, reorder, select, expand — all built in.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              "Virtualized",
              "Drag & Reorder",
              "Column Pinning",
              "Column Resize",
              "Sorting",
              "Filtering",
              "Pagination",
              "Row Selection",
              "Expandable Rows",
              "Infinite Scroll",
              "Shimmer Loading",
              "Context Menu",
              "Custom Icons",
              "Auto Height",
              "Theme-Agnostic",
            ].map((f) => (
              <Badge key={f} variant="secondary" className="text-xs">
                {f}
              </Badge>
            ))}
          </div>
          <div className="pt-2">
            <CodeBlock>{`npm install bolt-table @tanstack/react-virtual`}</CodeBlock>
          </div>
        </section>

        <Separator className="mb-12" />

        <Tabs defaultValue="examples" className="space-y-8">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="examples">Examples</TabsTrigger>
            <TabsTrigger value="usage">Quick Start</TabsTrigger>
          </TabsList>

          <TabsContent value="examples" className="space-y-16">
            <BasicExample />
            <PaginationExample />
            <SelectionExample />
            <ExpandableExample />
            <PinningExample />
            <LoadingExample />
            <InfiniteScrollExample />
            <VirtualizationExample />
            <StylingExample />
            <EmptyStateExample />
            <ServerSideExample />
            <CombinedExample />
          </TabsContent>

          <TabsContent value="usage" className="space-y-8 max-w-3xl">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold tracking-tight">Installation</h2>
              <CodeBlock>{`npm install bolt-table @tanstack/react-virtual`}</CodeBlock>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold tracking-tight">Minimal Example</h2>
              <CodeBlock>{`import { BoltTable, ColumnType } from 'bolt-table';

interface User {
  id: string;
  name: string;
  email: string;
  age: number;
}

const columns: ColumnType<User>[] = [
  { key: 'name',  dataIndex: 'name',  title: 'Name',  width: 200 },
  { key: 'email', dataIndex: 'email', title: 'Email', width: 280 },
  { key: 'age',   dataIndex: 'age',   title: 'Age',   width: 80  },
];

export default function App() {
  return (
    <BoltTable<User>
      columns={columns}
      data={users}
      rowKey="id"
      pagination={{ pageSize: 20 }}
    />
  );
}`}</CodeBlock>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold tracking-tight">Sorting</h2>
              <p className="text-sm text-muted-foreground">
                Client-side: just set <code className="text-xs bg-muted px-1 rounded">sortable: true</code> on columns. Server-side: pass <code className="text-xs bg-muted px-1 rounded">onSortChange</code>.
              </p>
              <CodeBlock>{`// Client-side sorting
const columns = [
  {
    key: 'name',
    dataIndex: 'name',
    title: 'Name',
    sortable: true,
    sorter: (a, b) => a.name.localeCompare(b.name),
  },
];

// Server-side sorting
<BoltTable
  onSortChange={(key, dir) => {
    refetch({ sortKey: key, sortDir: dir });
  }}
/>`}</CodeBlock>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold tracking-tight">Filtering</h2>
              <p className="text-sm text-muted-foreground">
                Right-click a column header and select "Filter Column". Custom filter functions supported.
              </p>
              <CodeBlock>{`// Client-side custom filter
{
  key: 'status',
  dataIndex: 'status',
  filterable: true,
  filterFn: (value, record) => record.status === value,
}

// Server-side filtering
<BoltTable
  onFilterChange={(filters) => {
    refetch({ filters });
  }}
/>`}</CodeBlock>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold tracking-tight">Row Selection</h2>
              <CodeBlock>{`const [selectedKeys, setSelectedKeys] = useState([]);

<BoltTable
  rowSelection={{
    type: 'checkbox', // or 'radio'
    selectedRowKeys: selectedKeys,
    onChange: (keys) => setSelectedKeys(keys),
    getCheckboxProps: (record) => ({
      disabled: record.status === 'locked',
    }),
  }}
/>`}</CodeBlock>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold tracking-tight">Expandable Rows</h2>
              <CodeBlock>{`<BoltTable
  expandable={{
    rowExpandable: (record) => record.hasDetails,
    expandedRowRender: (record) => (
      <DetailPanel record={record} />
    ),
  }}
  expandedRowHeight={150}
  maxExpandedRowHeight={400}
/>`}</CodeBlock>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold tracking-tight">Infinite Scroll</h2>
              <CodeBlock>{`<BoltTable
  data={data}
  isLoading={isLoading}
  onEndReached={loadMore}
  onEndReachedThreshold={8}
  pagination={false}
/>`}</CodeBlock>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold tracking-tight">Column Pinning</h2>
              <p className="text-sm text-muted-foreground">
                Set <code className="text-xs bg-muted px-1 rounded">pinned: 'left'</code> or <code className="text-xs bg-muted px-1 rounded">'right'</code> in column definitions, or right-click any header at runtime.
              </p>
              <CodeBlock>{`const columns = [
  { key: 'name', dataIndex: 'name', title: 'Name', pinned: 'left' },
  { key: 'actions', dataIndex: 'actions', title: '', pinned: 'right' },
];`}</CodeBlock>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold tracking-tight">Styling</h2>
              <CodeBlock>{`<BoltTable
  accentColor="#6366f1"
  classNames={{
    header: 'text-xs uppercase tracking-wider',
    cell: 'text-sm',
    pinnedHeader: 'border-r border-indigo-200',
  }}
  styles={{
    rowHover: { backgroundColor: '#f0f9ff' },
    rowSelected: { backgroundColor: '#e0e7ff' },
    pinnedBg: 'rgba(238, 242, 255, 0.95)',
  }}
/>`}</CodeBlock>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <footer className="border-t mt-20">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-6 text-xs text-muted-foreground">
          <span>MIT &copy; Venkatesh Sirigineedi</span>
          <a
            href="https://www.npmjs.com/package/bolt-table"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            npm install bolt-table
          </a>
        </div>
      </footer>
    </div>
  );
}
