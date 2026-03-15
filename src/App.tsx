import {
  useState,
  useMemo,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { Github, Linkedin, Mail } from "lucide-react";
import Playground from "./Playground";
import { BoltTable, type ColumnType, type SortDirection } from "bolt-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { generateMonitors, type Monitor } from "./data";

const allData = generateMonitors(200);

const statusColor: Record<Monitor["status"], string> = {
  active:
    "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950",
  degraded:
    "text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-950",
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
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[status]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${statusDot[status]}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function LatencyBar({ value }: { value: number }) {
  const pct = Math.min(value / 500, 1) * 100;
  const color =
    value < 100
      ? "bg-emerald-500"
      : value < 300
        ? "bg-yellow-500"
        : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground">
        {formatLatency(value)}
      </span>
    </div>
  );
}

function UptimeBadge({ value }: { value: number }) {
  const color =
    value >= 99.9
      ? "text-emerald-600"
      : value >= 99
        ? "text-yellow-600"
        : "text-red-600";
  return (
    <span className={`text-xs font-mono font-medium tabular-nums ${color}`}>
      {value.toFixed(2)}%
    </span>
  );
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
          <span className="text-sm font-medium text-foreground truncate">
            {record.name}
          </span>
          <span className="text-xs text-muted-foreground truncate">
            {record.url}
          </span>
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
      filterFn: (val: string, record: Monitor) =>
        record.status === val.toLowerCase(),
      render: (value: unknown) => (
        <StatusCell status={value as Monitor["status"]} />
      ),
    },
    {
      key: "region",
      dataIndex: "region",
      title: "Region",
      width: 140,
      sortable: true,
      render: (value: unknown) => (
        <span className="text-xs font-mono text-muted-foreground">
          {String(value)}
        </span>
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
        <Badge
          variant="secondary"
          className="font-mono text-[10px] px-1.5 py-0"
        >
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
        <span className="text-xs text-muted-foreground">
          {value as number}s
        </span>
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
        <span className="text-xs text-muted-foreground">
          {timeAgo(value as string)}
        </span>
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
        if (!tags?.length)
          return <span className="text-xs text-muted-foreground">—</span>;
        return (
          <div className="flex gap-1 flex-wrap">
            {tags.map((t) => (
              <Badge
                key={t}
                variant="outline"
                className="text-[10px] px-1.5 py-0"
              >
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
          <div className="font-mono text-xs">
            {formatLatency(record.latency)}
          </div>
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

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
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
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
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
          <span>
            {selectedKeys.length} of {data.length} selected
          </span>
          {selectedKeys.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={() => setSelectedKeys([])}
            >
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
            expandedRowRender: (record: Monitor) => (
              <ExpandedRowContent record={record} />
            ),
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
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<Monitor[]>(allData.slice(0, 20));

  const simulateLoad = useCallback(() => {
    setIsLoading(true);
    setData([]);
    setTimeout(() => {
      setData(allData.slice(0, 20));
      setIsLoading(false);
    }, 2500);
  }, []);

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
        <Button
          variant="outline"
          size="sm"
          onClick={simulateLoad}
          disabled={isLoading}
        >
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
  const [accentColor, setAccentColor] = useState("#8b5cf6");
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
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 bg-muted/30 p-4 rounded-lg border border-border/50">
          <label htmlFor="accent-color-picker" className="text-sm font-medium">
            Pick an Accent Color:
          </label>
          <div className="flex items-center gap-2">
            <input
              id="accent-color-picker"
              type="color"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent"
            />
            <code className="px-2 py-1 rounded bg-muted font-mono text-xs">
              {accentColor}
            </code>
          </div>
        </div>

        <div className="rounded-lg border overflow-hidden">
          <BoltTable<Monitor>
            columns={columns}
            data={data}
            rowKey="id"
            rowHeight={48}
            accentColor={accentColor}
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
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="opacity-40"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
                <path d="M8 11h6" />
              </svg>
              <div className="text-center">
                <p className="text-sm font-medium">No monitors found</p>
                <p className="text-xs mt-1">
                  Try adjusting your filters or add a new monitor.
                </p>
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
    (
      p: number,
      ps: number,
      sk: string,
      sd: SortDirection,
      f: Record<string, string>,
    ) => {
      setLoading(true);
      setTimeout(() => {
        let result = [...allData];

        Object.entries(f).forEach(([key, val]) => {
          if (val) {
            result = result.filter((row) => {
              const cell = String(
                row[key as keyof Monitor] ?? "",
              ).toLowerCase();
              return cell.includes(val.toLowerCase());
            });
          }
        });

        if (sk && sd) {
          result.sort((a, b) => {
            const av = a[sk as keyof Monitor];
            const bv = b[sk as keyof Monitor];
            if (typeof av === "number" && typeof bv === "number")
              return sd === "asc" ? av - bv : bv - av;
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
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={() => setSelectedKeys([])}
            >
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
            expandedRowRender: (record: Monitor) => (
              <ExpandedRowContent record={record} />
            ),
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
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-foreground"
              >
                <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
              <span className="font-semibold text-foreground tracking-tight">
                bolt-table
              </span>
            </div>
            <Badge variant="secondary" className="text-[10px] font-mono">
              npm
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="https://www.npmjs.com/package/bolt-table"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="ghost" size="sm" className="text-xs">
                npm
              </Button>
            </a>
            <a
              href="https://github.com/venkateshwebdev/Bolt-Table"
              target="_blank"
              rel="noopener noreferrer"
            >
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
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
                </svg>
              ) : (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
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
              A high-performance, virtualized React table. Only visible rows are
              in the DOM — handles any dataset size. Sort, filter, pin, resize,
              reorder, select, expand — all built in.
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
          <TabsList className="grid w-full max-w-lg grid-cols-4">
            <TabsTrigger value="examples">Examples</TabsTrigger>
            <TabsTrigger value="playground">Playground</TabsTrigger>
            <TabsTrigger value="usage">Quick Start</TabsTrigger>
            <TabsTrigger value="docs">Docs</TabsTrigger>
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

          <TabsContent value="playground">
            <Playground />
          </TabsContent>

          <TabsContent value="usage" className="space-y-8 max-w-3xl">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold tracking-tight">
                Installation
              </h2>
              <CodeBlock>{`npm install bolt-table @tanstack/react-virtual`}</CodeBlock>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold tracking-tight">
                Minimal Example
              </h2>
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
                Client-side: just set{" "}
                <code className="text-xs bg-muted px-1 rounded">
                  sortable: true
                </code>{" "}
                on columns. Server-side: pass{" "}
                <code className="text-xs bg-muted px-1 rounded">
                  onSortChange
                </code>
                .
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
              <h2 className="text-xl font-semibold tracking-tight">
                Filtering
              </h2>
              <p className="text-sm text-muted-foreground">
                Right-click a column header and select "Filter Column". Custom
                filter functions supported.
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
              <h2 className="text-xl font-semibold tracking-tight">
                Row Selection
              </h2>
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
              <h2 className="text-xl font-semibold tracking-tight">
                Expandable Rows
              </h2>
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
              <h2 className="text-xl font-semibold tracking-tight">
                Infinite Scroll
              </h2>
              <CodeBlock>{`<BoltTable
  data={data}
  isLoading={isLoading}
  onEndReached={loadMore}
  onEndReachedThreshold={8}
  pagination={false}
/>`}</CodeBlock>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold tracking-tight">
                Column Pinning
              </h2>
              <p className="text-sm text-muted-foreground">
                Set{" "}
                <code className="text-xs bg-muted px-1 rounded">
                  pinned: 'left'
                </code>{" "}
                or{" "}
                <code className="text-xs bg-muted px-1 rounded">'right'</code>{" "}
                in column definitions, or right-click any header at runtime.
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

          <TabsContent value="docs" className="space-y-12 max-w-4xl">
            {/* ── Core Concepts ── */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold tracking-tight">
                Core Concepts
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                BoltTable is built around three ideas:{" "}
                <strong>virtualization</strong> (only visible rows exist in the
                DOM), <strong>dual-mode operations</strong> (client-side or
                server-side — your choice), and{" "}
                <strong>zero-config styling</strong> (inline styles by default,
                no CSS imports needed).
              </p>
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                <p className="text-sm font-medium">The dual-mode rule</p>
                <p className="text-xs text-muted-foreground">
                  Every interactive feature (sorting, filtering, pagination)
                  works in two modes. <strong>Omit the callback</strong> and
                  BoltTable handles it locally.{" "}
                  <strong>Provide the callback</strong> and BoltTable delegates
                  to you.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left px-4 py-2 font-medium">
                        Feature
                      </th>
                      <th className="text-left px-4 py-2 font-medium">
                        Client-side (local)
                      </th>
                      <th className="text-left px-4 py-2 font-medium">
                        Server-side (delegated)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="px-4 py-2">Sorting</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        Omit{" "}
                        <code className="text-xs bg-muted px-1 rounded">
                          onSortChange
                        </code>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        Provide{" "}
                        <code className="text-xs bg-muted px-1 rounded">
                          onSortChange
                        </code>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2">Filtering</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        Omit{" "}
                        <code className="text-xs bg-muted px-1 rounded">
                          onFilterChange
                        </code>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        Provide{" "}
                        <code className="text-xs bg-muted px-1 rounded">
                          onFilterChange
                        </code>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2">Pagination</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        Pass all data +{" "}
                        <code className="text-xs bg-muted px-1 rounded">
                          pageSize
                        </code>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        Pass page data +{" "}
                        <code className="text-xs bg-muted px-1 rounded">
                          current, total
                        </code>{" "}
                        +{" "}
                        <code className="text-xs bg-muted px-1 rounded">
                          onPaginationChange
                        </code>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <Separator />

            {/* ── Column Definitions ── */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold tracking-tight">
                Column Definitions
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Columns are the backbone of BoltTable. Each column is a{" "}
                <code className="text-xs bg-muted px-1 rounded">
                  ColumnType&lt;T&gt;
                </code>{" "}
                object with required and optional fields.
              </p>

              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Required Fields</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border rounded-lg overflow-hidden">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="text-left px-4 py-2 font-medium">
                          Field
                        </th>
                        <th className="text-left px-4 py-2 font-medium">
                          Type
                        </th>
                        <th className="text-left px-4 py-2 font-medium">
                          Description
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      <tr>
                        <td className="px-4 py-2 font-mono text-xs">key</td>
                        <td className="px-4 py-2 text-muted-foreground text-xs">
                          string
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">
                          Unique identifier for drag, pin, hide, sort
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 font-mono text-xs">
                          dataIndex
                        </td>
                        <td className="px-4 py-2 text-muted-foreground text-xs">
                          string
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">
                          Property name on the row object to read
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 font-mono text-xs">title</td>
                        <td className="px-4 py-2 text-muted-foreground text-xs">
                          string | ReactNode
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">
                          Header label — plain text or React element
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Layout Fields</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border rounded-lg overflow-hidden">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="text-left px-4 py-2 font-medium">
                          Field
                        </th>
                        <th className="text-left px-4 py-2 font-medium">
                          Type
                        </th>
                        <th className="text-left px-4 py-2 font-medium">
                          Default
                        </th>
                        <th className="text-left px-4 py-2 font-medium">
                          Description
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      <tr>
                        <td className="px-4 py-2 font-mono text-xs">width</td>
                        <td className="px-4 py-2 text-muted-foreground text-xs">
                          number
                        </td>
                        <td className="px-4 py-2 text-muted-foreground text-xs">
                          150
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">
                          Width in pixels. Last column always stretches.
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 font-mono text-xs">hidden</td>
                        <td className="px-4 py-2 text-muted-foreground text-xs">
                          boolean
                        </td>
                        <td className="px-4 py-2 text-muted-foreground text-xs">
                          false
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">
                          Controlled visibility
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 font-mono text-xs">pinned</td>
                        <td className="px-4 py-2 text-muted-foreground text-xs">
                          'left' | 'right' | false
                        </td>
                        <td className="px-4 py-2 text-muted-foreground text-xs">
                          false
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">
                          Controlled pin state
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 font-mono text-xs">
                          className
                        </td>
                        <td className="px-4 py-2 text-muted-foreground text-xs">
                          string
                        </td>
                        <td className="px-4 py-2 text-muted-foreground text-xs">
                          —
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">
                          CSS class for all cells in this column
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 font-mono text-xs">style</td>
                        <td className="px-4 py-2 text-muted-foreground text-xs">
                          CSSProperties
                        </td>
                        <td className="px-4 py-2 text-muted-foreground text-xs">
                          —
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">
                          Inline styles for all cells
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Behavior Fields</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border rounded-lg overflow-hidden">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="text-left px-4 py-2 font-medium">
                          Field
                        </th>
                        <th className="text-left px-4 py-2 font-medium">
                          Type
                        </th>
                        <th className="text-left px-4 py-2 font-medium">
                          Default
                        </th>
                        <th className="text-left px-4 py-2 font-medium">
                          Description
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      <tr>
                        <td className="px-4 py-2 font-mono text-xs">
                          sortable
                        </td>
                        <td className="px-4 py-2 text-muted-foreground text-xs">
                          boolean
                        </td>
                        <td className="px-4 py-2 text-muted-foreground text-xs">
                          true
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">
                          Show sort controls
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 font-mono text-xs">sorter</td>
                        <td className="px-4 py-2 text-muted-foreground text-xs">
                          boolean | (a, b) =&gt; number
                        </td>
                        <td className="px-4 py-2 text-muted-foreground text-xs">
                          —
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">
                          <code className="text-xs bg-muted px-1 rounded">
                            true
                          </code>{" "}
                          for default, or custom comparator
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 font-mono text-xs">
                          filterable
                        </td>
                        <td className="px-4 py-2 text-muted-foreground text-xs">
                          boolean
                        </td>
                        <td className="px-4 py-2 text-muted-foreground text-xs">
                          true
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">
                          Show filter in context menu
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 font-mono text-xs">
                          filterFn
                        </td>
                        <td className="px-4 py-2 text-muted-foreground text-xs">
                          (val, record, dataIndex) =&gt; boolean
                        </td>
                        <td className="px-4 py-2 text-muted-foreground text-xs">
                          —
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">
                          Custom filter predicate
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Rendering Fields</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border rounded-lg overflow-hidden">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="text-left px-4 py-2 font-medium">
                          Field
                        </th>
                        <th className="text-left px-4 py-2 font-medium">
                          Type
                        </th>
                        <th className="text-left px-4 py-2 font-medium">
                          Description
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      <tr>
                        <td className="px-4 py-2 font-mono text-xs">render</td>
                        <td className="px-4 py-2 text-muted-foreground text-xs">
                          (value, record, index) =&gt; ReactNode
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">
                          Custom cell renderer. Omit to render raw value.
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 font-mono text-xs">
                          shimmerRender
                        </td>
                        <td className="px-4 py-2 text-muted-foreground text-xs">
                          () =&gt; ReactNode
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">
                          Custom loading skeleton for this column
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <CodeBlock>{`// Fully configured column example
const nameColumn: ColumnType<User> = {
  key: 'name',
  dataIndex: 'name',
  title: 'Full Name',
  width: 220,
  pinned: 'left',
  sortable: true,
  sorter: (a, b) => a.name.localeCompare(b.name),
  filterable: true,
  filterFn: (val, record) =>
    record.name.toLowerCase().includes(val.toLowerCase()),
  render: (value, record) => (
    <div>
      <strong>{record.name}</strong>
      <span style={{ color: '#888' }}>{record.email}</span>
    </div>
  ),
};`}</CodeBlock>
            </div>

            <Separator />

            {/* ── Data & Row Keys ── */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold tracking-tight">
                Data & Row Keys
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Pass an array of objects to{" "}
                <code className="text-xs bg-muted px-1 rounded">data</code>.
                Each object is one row. For client-side operations, pass the
                full dataset. For server-side, pass only the current page.
              </p>
              <CodeBlock>{`// rowKey as a string — reads record[rowKey]
<BoltTable rowKey="id" data={users} columns={columns} />

// rowKey as a function — compute the key yourself
<BoltTable rowKey={(record) => \`\${record.type}-\${record.id}\`} />

// Default is "id" when omitted
<BoltTable data={users} columns={columns} />`}</CodeBlock>
              <div className="rounded-lg border bg-amber-50 dark:bg-amber-950/30 p-4 space-y-2">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  TypeScript: the DataRecord constraint
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  BoltTable requires{" "}
                  <code className="text-xs bg-amber-100 dark:bg-amber-900/50 px-1 rounded">
                    T extends DataRecord
                  </code>{" "}
                  where{" "}
                  <code className="text-xs bg-amber-100 dark:bg-amber-900/50 px-1 rounded">
                    DataRecord = Record&lt;string, unknown&gt;
                  </code>
                  . If you use{" "}
                  <code className="text-xs bg-amber-100 dark:bg-amber-900/50 px-1 rounded">
                    interface
                  </code>
                  , add{" "}
                  <code className="text-xs bg-amber-100 dark:bg-amber-900/50 px-1 rounded">
                    [key: string]: unknown
                  </code>{" "}
                  as the first line.{" "}
                  <code className="text-xs bg-amber-100 dark:bg-amber-900/50 px-1 rounded">
                    type
                  </code>{" "}
                  aliases work without this.
                </p>
              </div>
            </div>

            <Separator />

            {/* ── Sorting ── */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold tracking-tight">Sorting</h2>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-3 rounded-lg border p-4">
                  <h3 className="text-sm font-semibold">
                    Client-side (default)
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Omit{" "}
                    <code className="text-xs bg-muted px-1 rounded">
                      onSortChange
                    </code>
                    . BoltTable sorts in memory.
                  </p>
                  <CodeBlock>{`{
  key: 'age',
  dataIndex: 'age',
  title: 'Age',
  sortable: true,
  // true = default comparator
  // function = custom logic
  sorter: (a, b) => a.age - b.age,
}`}</CodeBlock>
                </div>
                <div className="space-y-3 rounded-lg border p-4">
                  <h3 className="text-sm font-semibold">Server-side</h3>
                  <p className="text-xs text-muted-foreground">
                    Provide{" "}
                    <code className="text-xs bg-muted px-1 rounded">
                      onSortChange
                    </code>
                    . BoltTable delegates to you.
                  </p>
                  <CodeBlock>{`<BoltTable
  columns={columns}
  data={serverData}
  onSortChange={(key, dir) => {
    // dir: 'asc' | 'desc' | null
    setSortKey(key);
    setSortDir(dir);
    refetch({ sort: key, order: dir });
  }}
/>`}</CodeBlock>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                <strong>Sort cycle:</strong> click a column header or use the
                context menu to cycle through{" "}
                <code className="text-xs bg-muted px-1 rounded">
                  null → asc → desc → null
                </code>
                . Only one column is sorted at a time.
              </p>
            </div>

            <Separator />

            {/* ── Filtering ── */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold tracking-tight">Filtering</h2>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-3 rounded-lg border p-4">
                  <h3 className="text-sm font-semibold">
                    Client-side (default)
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Omit{" "}
                    <code className="text-xs bg-muted px-1 rounded">
                      onFilterChange
                    </code>
                    . Users filter via right-click context menu.
                  </p>
                  <CodeBlock>{`{
  key: 'status',
  dataIndex: 'status',
  filterable: true,
  // Custom: exact match
  filterFn: (val, record) =>
    record.status === val.toLowerCase(),
}
// No filterFn → case-insensitive
// substring match (default)`}</CodeBlock>
                </div>
                <div className="space-y-3 rounded-lg border p-4">
                  <h3 className="text-sm font-semibold">Server-side</h3>
                  <p className="text-xs text-muted-foreground">
                    Provide{" "}
                    <code className="text-xs bg-muted px-1 rounded">
                      onFilterChange
                    </code>
                    . Receives a filters map.
                  </p>
                  <CodeBlock>{`<BoltTable
  columns={columns}
  data={serverData}
  onFilterChange={(filters) => {
    // { status: "active", region: "us" }
    // column removed when cleared
    setFilters(filters);
    refetch({ filters });
  }}
/>`}</CodeBlock>
                </div>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-sm font-medium mb-2">How users filter</p>
                <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Right-click a column header</li>
                  <li>Click "Filter Column" in the context menu</li>
                  <li>Type a value and press Enter</li>
                  <li>A filter icon appears in the header when active</li>
                  <li>Right-click again → "Clear Filter" to remove</li>
                </ol>
              </div>
            </div>

            <Separator />

            {/* ── Pagination ── */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold tracking-tight">Pagination</h2>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-3 rounded-lg border p-4">
                  <h3 className="text-sm font-semibold">Client-side</h3>
                  <p className="text-xs text-muted-foreground">
                    Pass all data. BoltTable slices it per page.
                  </p>
                  <CodeBlock>{`<BoltTable
  columns={columns}
  data={allUsers}  // all 500 users
  pagination={{ pageSize: 20 }}
/>`}</CodeBlock>
                </div>
                <div className="space-y-3 rounded-lg border p-4">
                  <h3 className="text-sm font-semibold">Server-side</h3>
                  <p className="text-xs text-muted-foreground">
                    Pass current page only. Set{" "}
                    <code className="text-xs bg-muted px-1 rounded">total</code>{" "}
                    for page count.
                  </p>
                  <CodeBlock>{`<BoltTable
  columns={columns}
  data={pageData}       // current page
  pagination={{
    current: page,
    pageSize: 20,
    total: 500,         // for page numbers
    showTotal: (t, [a, b]) =>
      \`\${a}–\${b} of \${t}\`,
  }}
  onPaginationChange={(p, s) => {
    setPage(p);
    setPageSize(s);
  }}
/>`}</CodeBlock>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left px-4 py-2 font-medium">Field</th>
                      <th className="text-left px-4 py-2 font-medium">Type</th>
                      <th className="text-left px-4 py-2 font-medium">
                        Default
                      </th>
                      <th className="text-left px-4 py-2 font-medium">
                        Description
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="px-4 py-2 font-mono text-xs">current</td>
                      <td className="px-4 py-2 text-muted-foreground text-xs">
                        number
                      </td>
                      <td className="px-4 py-2 text-muted-foreground text-xs">
                        1
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        Active page (1-based)
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono text-xs">pageSize</td>
                      <td className="px-4 py-2 text-muted-foreground text-xs">
                        number
                      </td>
                      <td className="px-4 py-2 text-muted-foreground text-xs">
                        10
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        Rows per page
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono text-xs">total</td>
                      <td className="px-4 py-2 text-muted-foreground text-xs">
                        number
                      </td>
                      <td className="px-4 py-2 text-muted-foreground text-xs">
                        data.length
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        Total rows (required for server-side)
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono text-xs">showTotal</td>
                      <td className="px-4 py-2 text-muted-foreground text-xs">
                        (total, [from, to]) =&gt; ReactNode
                      </td>
                      <td className="px-4 py-2 text-muted-foreground text-xs">
                        —
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        Custom "showing X of Y" label
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground">
                Set{" "}
                <code className="text-xs bg-muted px-1 rounded">
                  pagination={"{false}"}
                </code>{" "}
                to disable pagination entirely. All rows render in a single
                virtualized viewport.
              </p>
            </div>

            <Separator />

            {/* ── Row Selection ── */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold tracking-tight">
                Row Selection
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Prepends a checkbox or radio column. BoltTable does not manage
                selection state — you track{" "}
                <code className="text-xs bg-muted px-1 rounded">
                  selectedRowKeys
                </code>{" "}
                yourself.
              </p>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-3 rounded-lg border p-4">
                  <h3 className="text-sm font-semibold">
                    Checkbox (multi-select)
                  </h3>
                  <CodeBlock>{`const [keys, setKeys] = useState([]);

<BoltTable
  rowSelection={{
    type: 'checkbox',
    selectedRowKeys: keys,
    onChange: (keys) => setKeys(keys),
    getCheckboxProps: (record) => ({
      disabled: record.locked,
    }),
  }}
/>`}</CodeBlock>
                </div>
                <div className="space-y-3 rounded-lg border p-4">
                  <h3 className="text-sm font-semibold">
                    Radio (single-select)
                  </h3>
                  <CodeBlock>{`const [keys, setKeys] = useState([]);

<BoltTable
  rowSelection={{
    type: 'radio',
    selectedRowKeys: keys,
    onChange: (keys) => setKeys(keys),
  }}
/>`}</CodeBlock>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left px-4 py-2 font-medium">Field</th>
                      <th className="text-left px-4 py-2 font-medium">Type</th>
                      <th className="text-left px-4 py-2 font-medium">
                        Description
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="px-4 py-2 font-mono text-xs">type</td>
                      <td className="px-4 py-2 text-muted-foreground text-xs">
                        'checkbox' | 'radio'
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        Selection control type (default: checkbox)
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono text-xs">
                        selectedRowKeys
                      </td>
                      <td className="px-4 py-2 text-muted-foreground text-xs">
                        React.Key[]
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        Currently selected keys (required)
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono text-xs">onChange</td>
                      <td className="px-4 py-2 text-muted-foreground text-xs">
                        (keys, rows, info) =&gt; void
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        Primary selection change callback
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono text-xs">onSelect</td>
                      <td className="px-4 py-2 text-muted-foreground text-xs">
                        (record, selected, rows, event) =&gt; void
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        Single row toggle callback
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono text-xs">
                        onSelectAll
                      </td>
                      <td className="px-4 py-2 text-muted-foreground text-xs">
                        (selected, selectedRows, changeRows) =&gt; void
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        Header checkbox toggle callback
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono text-xs">
                        getCheckboxProps
                      </td>
                      <td className="px-4 py-2 text-muted-foreground text-xs">
                        (record) =&gt; {"{ disabled? }"}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        Disable specific rows
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono text-xs">
                        hideSelectAll
                      </td>
                      <td className="px-4 py-2 text-muted-foreground text-xs">
                        boolean
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        Hide the header select-all checkbox
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <Separator />

            {/* ── Expandable Rows ── */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold tracking-tight">
                Expandable Rows
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Expandable rows reveal a content panel below each row. Supports
                both uncontrolled (BoltTable manages state) and controlled (you
                manage state) modes. Content height is auto-measured via{" "}
                <code className="text-xs bg-muted px-1 rounded">
                  ResizeObserver
                </code>
                .
              </p>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-3 rounded-lg border p-4">
                  <h3 className="text-sm font-semibold">Uncontrolled</h3>
                  <CodeBlock>{`<BoltTable
  expandable={{
    rowExpandable: (r) => r.hasDetails,
    expandedRowRender: (record) => (
      <DetailPanel record={record} />
    ),
  }}
  expandedRowHeight={200}
  maxExpandedRowHeight={400}
/>`}</CodeBlock>
                </div>
                <div className="space-y-3 rounded-lg border p-4">
                  <h3 className="text-sm font-semibold">Controlled</h3>
                  <CodeBlock>{`const [expanded, setExpanded] = useState([]);

<BoltTable
  expandable={{
    expandedRowKeys: expanded,
    onExpandedRowsChange: setExpanded,
    expandedRowRender: (record) => (
      <DetailPanel record={record} />
    ),
  }}
/>`}</CodeBlock>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left px-4 py-2 font-medium">Field</th>
                      <th className="text-left px-4 py-2 font-medium">Type</th>
                      <th className="text-left px-4 py-2 font-medium">
                        Description
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="px-4 py-2 font-mono text-xs">
                        expandedRowRender
                      </td>
                      <td className="px-4 py-2 text-muted-foreground text-xs">
                        (record, index, indent, expanded) =&gt; ReactNode
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        Renders expanded content (required)
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono text-xs">
                        rowExpandable
                      </td>
                      <td className="px-4 py-2 text-muted-foreground text-xs">
                        (record) =&gt; boolean
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        Which rows show the expand toggle
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono text-xs">
                        expandedRowKeys
                      </td>
                      <td className="px-4 py-2 text-muted-foreground text-xs">
                        React.Key[]
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        Controlled expanded keys
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono text-xs">
                        defaultExpandedRowKeys
                      </td>
                      <td className="px-4 py-2 text-muted-foreground text-xs">
                        React.Key[]
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        Initially expanded (uncontrolled)
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono text-xs">
                        defaultExpandAllRows
                      </td>
                      <td className="px-4 py-2 text-muted-foreground text-xs">
                        boolean
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        Expand all on mount
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono text-xs">
                        onExpandedRowsChange
                      </td>
                      <td className="px-4 py-2 text-muted-foreground text-xs">
                        (keys) =&gt; void
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        Expansion state changed
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <Separator />

            {/* ── Column Interactions ── */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold tracking-tight">
                Column Interactions
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Four column interactions are enabled by default. All fire
                optional callbacks so you can persist changes.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border p-4 space-y-2">
                  <h3 className="text-sm font-semibold">Drag to Reorder</h3>
                  <p className="text-xs text-muted-foreground">
                    Drag column headers to reorder. Custom zero-dependency drag
                    implementation — no @dnd-kit needed. Pinned columns cannot
                    be dragged.
                  </p>
                  <CodeBlock>{`onColumnOrderChange={(order) =>
  saveOrder(order) // string[]
}`}</CodeBlock>
                </div>
                <div className="rounded-lg border p-4 space-y-2">
                  <h3 className="text-sm font-semibold">Resize</h3>
                  <p className="text-xs text-muted-foreground">
                    Drag the right edge of any header. A colored overlay line
                    and width label follow the cursor.
                  </p>
                  <CodeBlock>{`onColumnResize={(key, width) =>
  saveWidth(key, width) // number
}`}</CodeBlock>
                </div>
                <div className="rounded-lg border p-4 space-y-2">
                  <h3 className="text-sm font-semibold">Pin</h3>
                  <p className="text-xs text-muted-foreground">
                    Set{" "}
                    <code className="text-xs bg-muted px-1 rounded">
                      pinned: 'left'
                    </code>{" "}
                    in column defs, or users right-click → "Pin to Left/Right".
                  </p>
                  <CodeBlock>{`onColumnPin={(key, pinned) =>
  // 'left' | 'right' | false
  savePinState(key, pinned)
}`}</CodeBlock>
                </div>
                <div className="rounded-lg border p-4 space-y-2">
                  <h3 className="text-sm font-semibold">Hide</h3>
                  <p className="text-xs text-muted-foreground">
                    Users right-click → "Hide Column". Pinned columns cannot be
                    hidden.
                  </p>
                  <CodeBlock>{`onColumnHide={(key, hidden) =>
  // true = just hidden
  saveVisibility(key, hidden)
}`}</CodeBlock>
                </div>
              </div>
            </div>

            <Separator />

            {/* ── Loading States ── */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold tracking-tight">
                Loading States
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left px-4 py-2 font-medium">State</th>
                      <th className="text-left px-4 py-2 font-medium">
                        Headers
                      </th>
                      <th className="text-left px-4 py-2 font-medium">Body</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="px-4 py-2 text-xs">
                        <code className="bg-muted px-1 rounded">
                          isLoading=true
                        </code>
                        , data empty
                      </td>
                      <td className="px-4 py-2 text-muted-foreground text-xs">
                        Real headers
                      </td>
                      <td className="px-4 py-2 text-muted-foreground text-xs">
                        Shimmer skeleton rows
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-xs">
                        <code className="bg-muted px-1 rounded">
                          isLoading=true
                        </code>
                        , data present
                      </td>
                      <td className="px-4 py-2 text-muted-foreground text-xs">
                        Real headers
                      </td>
                      <td className="px-4 py-2 text-muted-foreground text-xs">
                        Real rows + shimmer at bottom
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-xs">
                        <code className="bg-muted px-1 rounded">
                          layoutLoading=true
                        </code>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground text-xs">
                        Shimmer headers
                      </td>
                      <td className="px-4 py-2 text-muted-foreground text-xs">
                        Shimmer rows
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <CodeBlock>{`// Initial load
<BoltTable columns={columns} data={data} isLoading={isFetching} />

// Full skeleton (headers unknown)
<BoltTable columns={columns} data={[]} layoutLoading={!ready} />

// Custom shimmer per column
{
  key: 'avatar',
  shimmerRender: () => (
    <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#eee' }} />
  ),
}`}</CodeBlock>
            </div>

            <Separator />

            {/* ── Infinite Scroll ── */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold tracking-tight">
                Infinite Scroll
              </h2>
              <CodeBlock>{`const [data, setData] = useState([]);
const [loading, setLoading] = useState(false);

const loadMore = async () => {
  if (loading) return;
  setLoading(true);
  const rows = await fetchNextPage(data.length);
  setData(prev => [...prev, ...rows]);
  setLoading(false);
};

<BoltTable
  columns={columns}
  data={data}
  isLoading={loading}
  onEndReached={loadMore}
  onEndReachedThreshold={8}  // trigger 8 rows from bottom
  pagination={false}          // required
  autoHeight={false}          // required — needs fixed viewport
/>`}</CodeBlock>
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                <p className="text-sm font-medium">Key points</p>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                  <li>
                    Built-in debounce guard prevents repeated firing. Resets
                    when{" "}
                    <code className="text-xs bg-muted px-1 rounded">
                      data.length
                    </code>{" "}
                    changes or{" "}
                    <code className="text-xs bg-muted px-1 rounded">
                      isLoading
                    </code>{" "}
                    flips to false.
                  </li>
                  <li>
                    Set{" "}
                    <code className="text-xs bg-muted px-1 rounded">
                      pagination={"{false}"}
                    </code>{" "}
                    — pagination and infinite scroll are mutually exclusive.
                  </li>
                  <li>
                    Set{" "}
                    <code className="text-xs bg-muted px-1 rounded">
                      autoHeight={"{false}"}
                    </code>{" "}
                    and wrap in a fixed-height container.
                  </li>
                </ul>
              </div>
            </div>

            <Separator />

            {/* ── Styling & Theming ── */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold tracking-tight">
                Styling & Theming
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Three layers of customization, from broad to granular.
              </p>

              <div className="space-y-6">
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">
                    Layer 1: accentColor
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    A single color string that themes all interactive elements —
                    sort icons, filter icons, resize line, selected rows, expand
                    chevrons, checkboxes, pagination highlight.
                  </p>
                  <CodeBlock>{`<BoltTable accentColor="#6366f1" />  // default: #1890ff`}</CodeBlock>
                </div>

                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">Layer 2: classNames</h3>
                  <p className="text-xs text-muted-foreground">
                    CSS class overrides per table region. Appended to (not
                    replacing) defaults.
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border rounded-lg overflow-hidden">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="text-left px-4 py-2 font-medium">
                            Key
                          </th>
                          <th className="text-left px-4 py-2 font-medium">
                            Applies to
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        <tr>
                          <td className="px-4 py-2 font-mono text-xs">
                            header
                          </td>
                          <td className="px-4 py-2 text-muted-foreground">
                            All non-pinned header cells
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2 font-mono text-xs">cell</td>
                          <td className="px-4 py-2 text-muted-foreground">
                            All body cells
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2 font-mono text-xs">row</td>
                          <td className="px-4 py-2 text-muted-foreground">
                            Each row wrapper
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2 font-mono text-xs">
                            pinnedHeader
                          </td>
                          <td className="px-4 py-2 text-muted-foreground">
                            Pinned headers (in addition to header)
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2 font-mono text-xs">
                            pinnedCell
                          </td>
                          <td className="px-4 py-2 text-muted-foreground">
                            Pinned body cells (in addition to cell)
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2 font-mono text-xs">
                            dragHeader
                          </td>
                          <td className="px-4 py-2 text-muted-foreground">
                            Ghost column while dragging
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2 font-mono text-xs">
                            expandedRow
                          </td>
                          <td className="px-4 py-2 text-muted-foreground">
                            Expanded content panel
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">Layer 3: styles</h3>
                  <p className="text-xs text-muted-foreground">
                    Inline CSS overrides with highest specificity.
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border rounded-lg overflow-hidden">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="text-left px-4 py-2 font-medium">
                            Key
                          </th>
                          <th className="text-left px-4 py-2 font-medium">
                            Type
                          </th>
                          <th className="text-left px-4 py-2 font-medium">
                            Description
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        <tr>
                          <td className="px-4 py-2 font-mono text-xs">
                            header
                          </td>
                          <td className="px-4 py-2 text-muted-foreground text-xs">
                            CSSProperties
                          </td>
                          <td className="px-4 py-2 text-muted-foreground">
                            Header cells
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2 font-mono text-xs">cell</td>
                          <td className="px-4 py-2 text-muted-foreground text-xs">
                            CSSProperties
                          </td>
                          <td className="px-4 py-2 text-muted-foreground">
                            Body cells
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2 font-mono text-xs">
                            pinnedBg
                          </td>
                          <td className="px-4 py-2 text-muted-foreground text-xs">
                            string
                          </td>
                          <td className="px-4 py-2 text-muted-foreground">
                            CSS color for pinned backgrounds
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2 font-mono text-xs">
                            rowHover
                          </td>
                          <td className="px-4 py-2 text-muted-foreground text-xs">
                            CSSProperties
                          </td>
                          <td className="px-4 py-2 text-muted-foreground">
                            Hovered row background
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2 font-mono text-xs">
                            rowSelected
                          </td>
                          <td className="px-4 py-2 text-muted-foreground text-xs">
                            CSSProperties
                          </td>
                          <td className="px-4 py-2 text-muted-foreground">
                            Selected row background
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* ── Context Menu ── */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold tracking-tight">
                Context Menu
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Right-clicking any column header opens a context menu with
                built-in actions: Sort Asc/Desc, Filter Column, Pin Left/Right,
                Hide Column. Add your own items below the defaults.
              </p>
              <CodeBlock>{`const customItems: ColumnContextMenuItem[] = [
  {
    key: 'copy',
    label: 'Copy Column Data',
    icon: <CopyIcon className="h-3 w-3" />,
    onClick: (columnKey) => {
      const values = data.map(r => r[columnKey]);
      navigator.clipboard.writeText(values.join('\\n'));
    },
  },
  {
    key: 'delete',
    label: 'Remove Column',
    danger: true,     // renders in red
    disabled: false,  // can be dynamic
    onClick: (columnKey) => removeColumn(columnKey),
  },
];

<BoltTable columnContextMenuItems={customItems} />`}</CodeBlock>
            </div>

            <Separator />

            {/* ── Auto Height ── */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold tracking-tight">
                Auto Height vs Fixed Height
              </h2>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-3 rounded-lg border p-4">
                  <h3 className="text-sm font-semibold">
                    autoHeight=true (default)
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Table auto-sizes to content, capped at 10 rows. Fewer rows =
                    smaller table.
                  </p>
                  <CodeBlock>{`<BoltTable
  columns={columns}
  data={data}
  autoHeight={true}
/>`}</CodeBlock>
                </div>
                <div className="space-y-3 rounded-lg border p-4">
                  <h3 className="text-sm font-semibold">autoHeight=false</h3>
                  <p className="text-xs text-muted-foreground">
                    Table fills parent container. Parent must provide a height.
                    Required for infinite scroll.
                  </p>
                  <CodeBlock>{`<div style={{ height: 600 }}>
  <BoltTable
    columns={columns}
    data={data}
    autoHeight={false}
  />
</div>`}</CodeBlock>
                </div>
              </div>
            </div>

            <Separator />

            {/* ── Custom Icons ── */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold tracking-tight">
                Custom Icons
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Every built-in icon can be replaced via the{" "}
                <code className="text-xs bg-muted px-1 rounded">icons</code>{" "}
                prop. All default icons are inline SVGs at 12×12px.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left px-4 py-2 font-medium">Key</th>
                      <th className="text-left px-4 py-2 font-medium">
                        Used In
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="px-4 py-2 font-mono text-xs">
                        gripVertical
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        Column header drag handle
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono text-xs">
                        sortAsc / sortDesc
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        Sort indicators in header
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono text-xs">
                        filter / filterClear
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        Filter indicator + clear button
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono text-xs">
                        pin / pinOff
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        Pin/unpin in context menu + header
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono text-xs">eyeOff</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        Hide column in context menu
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono text-xs">
                        chevronDown
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        Expand toggle / page size dropdown
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono text-xs">
                        chevronLeft / chevronRight
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        Pagination prev/next
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono text-xs">
                        chevronsLeft / chevronsRight
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        Pagination first/last
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <CodeBlock>{`import { GripVertical, ArrowUpAZ, ArrowDownAZ } from 'lucide-react';

<BoltTable
  icons={{
    gripVertical: <GripVertical size={12} />,
    sortAsc: <ArrowUpAZ size={12} />,
    sortDesc: <ArrowDownAZ size={12} />,
  }}
  hideGripIcon={false}  // set true to hide drag handle
/>`}</CodeBlock>
            </div>

            <Separator />

            {/* ── TypeScript ── */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold tracking-tight">TypeScript</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                BoltTable is fully typed. The generic parameter{" "}
                <code className="text-xs bg-muted px-1 rounded">T</code> flows
                through column{" "}
                <code className="text-xs bg-muted px-1 rounded">render</code>,{" "}
                <code className="text-xs bg-muted px-1 rounded">sorter</code>,{" "}
                <code className="text-xs bg-muted px-1 rounded">filterFn</code>,
                and selection callbacks.
              </p>
              <CodeBlock>{`import { BoltTable, ColumnType, SortDirection } from 'bolt-table';
import type {
  DataRecord,            // Record<string, unknown>
  ColumnContextMenuItem, // Custom context menu item
  ExpandableConfig,      // Expandable rows config
  PaginationType,        // Pagination config
  RowSelectionConfig,    // Row selection config
  BoltTableIcons,        // Icon override map
} from 'bolt-table';

// interface — needs index signature
interface Product {
  [key: string]: unknown;
  id: string;
  name: string;
  price: number;
}

// type — works without it
type Product = {
  id: string;
  name: string;
  price: number;
};

<BoltTable<Product> columns={columns} data={products} />`}</CodeBlock>
            </div>

            <Separator />

            {/* ── Performance ── */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold tracking-tight">Performance</h2>
              <div className="space-y-4">
                <div className="rounded-lg border p-4 space-y-2">
                  <h3 className="text-sm font-semibold">
                    Memoize columns and data
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    BoltTable watches columns via a content fingerprint. Memoize
                    to avoid unnecessary re-renders.
                  </p>
                  <CodeBlock>{`// Good
const columns = useMemo(() => buildColumns(), []);
const data = useMemo(() => allData.slice(0, 50), [allData]);

// Bad — new array every render
const columns = buildColumns();`}</CodeBlock>
                </div>
                <div className="rounded-lg border p-4 space-y-2">
                  <h3 className="text-sm font-semibold">
                    Large datasets (10,000+ rows)
                  </h3>
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                    <li>
                      Set{" "}
                      <code className="text-xs bg-muted px-1 rounded">
                        pagination={"{false}"}
                      </code>{" "}
                      and{" "}
                      <code className="text-xs bg-muted px-1 rounded">
                        autoHeight={"{false}"}
                      </code>{" "}
                      for a fixed virtualized viewport
                    </li>
                    <li>
                      Avoid complex render functions with many DOM nodes per
                      cell
                    </li>
                    <li>
                      Use a uniform{" "}
                      <code className="text-xs bg-muted px-1 rounded">
                        rowHeight
                      </code>{" "}
                      to skip dynamic measurement
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <Separator />

            {/* ── Server-Side Full Example ── */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold tracking-tight">
                Server-Side Operations
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                A complete example with server-side sort, filter, and pagination
                — all three delegated to your API.
              </p>
              <CodeBlock>{`import { useState, useEffect, useCallback } from 'react';
import { BoltTable, ColumnType, SortDirection } from 'bolt-table';

interface User {
  [key: string]: unknown;
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function UsersTable() {
  const [data, setData] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortKey, setSortKey] = useState('');
  const [sortDir, setSortDir] = useState<SortDirection>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/users?' + new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      ...(sortKey && sortDir ? { sortKey, sortDir } : {}),
      ...filters,
    }));
    const json = await res.json();
    setData(json.rows);
    setTotal(json.total);
    setLoading(false);
  }, [page, pageSize, sortKey, sortDir, filters]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <BoltTable<User>
      columns={columns}
      data={data}
      rowKey="id"
      isLoading={loading}
      pagination={{ current: page, pageSize, total }}
      onPaginationChange={(p, s) => { setPage(p); setPageSize(s); }}
      onSortChange={(key, dir) => {
        setSortKey(key); setSortDir(dir); setPage(1);
      }}
      onFilterChange={(f) => { setFilters(f); setPage(1); }}
    />
  );
}`}</CodeBlock>
            </div>

            <Separator />

            {/* ── BoltTable Props Reference ── */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold tracking-tight">
                BoltTable Props Reference
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left px-4 py-2 font-medium">Prop</th>
                      <th className="text-left px-4 py-2 font-medium">Type</th>
                      <th className="text-left px-4 py-2 font-medium">
                        Default
                      </th>
                      <th className="text-left px-4 py-2 font-medium">
                        Description
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-xs">
                    <tr>
                      <td className="px-4 py-2 font-mono">columns</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        ColumnType&lt;T&gt;[]
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">—</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        Column definitions (required)
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono">data</td>
                      <td className="px-4 py-2 text-muted-foreground">T[]</td>
                      <td className="px-4 py-2 text-muted-foreground">—</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        Row data array (required)
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono">rowKey</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        string | (record) =&gt; string
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">'id'</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        Unique row identifier
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono">rowHeight</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        number
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">40</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        Row height in pixels
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono">expandedRowHeight</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        number
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">200</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        Estimated expanded row height
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono">
                        maxExpandedRowHeight
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        number
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">—</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        Max height (scrollable beyond)
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono">accentColor</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        string
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        '#1890ff'
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        Theme color for interactive elements
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono">className</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        string
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">''</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        Outer wrapper class
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono">classNames</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        ClassNamesTypes
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {"{}"}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        Granular class overrides
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono">styles</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        StylesTypes
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {"{}"}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        Inline style overrides
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono">icons</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        BoltTableIcons
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">—</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        Custom icon overrides
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono">pagination</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        PaginationType | false
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">—</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        Pagination config or false to disable
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono">
                        onPaginationChange
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        (page, pageSize) =&gt; void
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">—</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        Page or page-size changed
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono">onColumnResize</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        (key, width) =&gt; void
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">—</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        Column resized
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono">
                        onColumnOrderChange
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        (order) =&gt; void
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">—</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        Columns reordered
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono">onColumnPin</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        (key, pinned) =&gt; void
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">—</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        Column pinned/unpinned
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono">onColumnHide</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        (key, hidden) =&gt; void
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">—</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        Column hidden/shown
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono">rowSelection</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        RowSelectionConfig&lt;T&gt;
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">—</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        Row selection config
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono">expandable</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        ExpandableConfig&lt;T&gt;
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">—</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        Expandable row config
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono">onEndReached</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        () =&gt; void
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">—</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        Infinite scroll trigger
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono">
                        onEndReachedThreshold
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        number
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">5</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        Rows from end to trigger
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono">isLoading</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        boolean
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">false</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        Show shimmer skeleton rows
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono">layoutLoading</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        boolean
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">false</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        Full skeleton (headers + rows)
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono">onSortChange</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        (key, direction) =&gt; void
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">—</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        Server-side sort handler
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono">onFilterChange</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        (filters) =&gt; void
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">—</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        Server-side filter handler
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono">
                        columnContextMenuItems
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        ColumnContextMenuItem[]
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">—</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        Custom context menu items
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono">autoHeight</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        boolean
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">true</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        Auto-size to content (max 10 rows)
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono">emptyRenderer</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        ReactNode
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">—</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        Custom empty state content
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <Separator />

            {/* ── Frameworks ── */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold tracking-tight">
                Framework Guides
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border p-4 space-y-2">
                  <h3 className="text-sm font-semibold">
                    Next.js (App Router)
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    BoltTable uses browser APIs. Add the client boundary:
                  </p>
                  <CodeBlock>{`'use client';
import { BoltTable } from 'bolt-table';`}</CodeBlock>
                </div>
                <div className="rounded-lg border p-4 space-y-2">
                  <h3 className="text-sm font-semibold">
                    Next.js (Pages Router)
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    No special config needed. Pages Router components are
                    client-side by default.
                  </p>
                </div>
                <div className="rounded-lg border p-4 space-y-2">
                  <h3 className="text-sm font-semibold">Vite</h3>
                  <p className="text-xs text-muted-foreground">
                    Works out of the box. No configuration needed.
                  </p>
                </div>
                <div className="rounded-lg border p-4 space-y-2">
                  <h3 className="text-sm font-semibold">
                    Remix / React Router
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Works out of the box. No configuration needed.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <footer className="border-t mt-20">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>MIT &copy; Venkatesh Sirigineedi</span>
            <div className="flex items-center gap-3">
              <a
                href="https://github.com/venkateshwebdev"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
                aria-label="GitHub"
              >
                <Github size={16} />
              </a>
              <a
                href="https://www.linkedin.com/in/venkatesh-sirigineedi"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin size={16} />
              </a>
              <a
                href="https://mail.google.com/mail/?view=cm&fs=1&to=venkateshsirigineedi32@gmail.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
                aria-label="Email"
              >
                <Mail size={16} />
              </a>
            </div>
          </div>

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
