'use client';

interface StatusChartProps {
  total: number;
  active: number;
  maintenance: number;
  complete: number;
}

export default function StatusChart({ total, active, maintenance, complete }: StatusChartProps) {
  const cx = 120, cy = 120, r = 90, strokeWidth = 30;
  const normalizedRadius = r - strokeWidth / 2;
  const circumference = 2 * Math.PI * normalizedRadius;

  const items: { value: number; label: string; color: string }[] = [
    { value: active, label: 'LOTOTO Aktif', color: '#ef4444' },
    { value: maintenance, label: 'Maintenance', color: '#f59e0b' },
    { value: complete, label: 'Selesai', color: '#22c55e' },
  ];

  const sum = items.reduce((a, b) => a + b.value, 0) || 1;

  let offset = 0;
  const segments = items.map((item) => {
    const fraction = item.value / sum;
    const length = fraction * circumference;
    const seg = { ...item, length, offset, fraction };
    offset += length;
    return seg;
  });

  return (
    <section className="chart-section">
      <div className="chart-header">
        <div className="chart-title-wrapper">
          <i className="fa-solid fa-chart-pie"></i>
          <h2>Overview Status</h2>
        </div>
        <span className="chart-total-badge">{total} Total Pekerjaan</span>
      </div>
      <div className="chart-body">
        <div className="donut-wrapper">
          <svg width={cx * 2} height={cy * 2} viewBox={`0 0 ${cx * 2} ${cy * 2}`}>
            <defs>
              <filter id="donut-shadow">
                <feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.15" />
              </filter>
            </defs>
            {/* Base circle shadow */}
            <circle
              cx={cx} cy={cy} r={normalizedRadius}
              fill="none" stroke="#e2e8f0" strokeWidth={strokeWidth}
            />
            {/* Segments */}
            {segments.map((seg) =>
              seg.value > 0 ? (
                <circle
                  key={seg.label}
                  cx={cx} cy={cy} r={normalizedRadius}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${seg.length} ${circumference - seg.length}`}
                  strokeDashoffset={-seg.offset}
                  strokeLinecap="round"
                  transform={`rotate(-90 ${cx} ${cy})`}
                  style={{ transition: 'stroke-dasharray 0.6s ease' }}
                  filter="url(#donut-shadow)"
                />
              ) : null
            )}
            {/* Hub center */}
            <circle cx={cx} cy={cy} r={22} fill="var(--card, #fff)" stroke="#e2e8f0" strokeWidth="2" />
            <text
              x={cx} y={cy - 6}
              textAnchor="middle"
              fontSize="20"
              fontWeight="700"
              fill="var(--text, #1e293b)"
            >
              {sum}
            </text>
            <text
              x={cx} y={cy + 14}
              textAnchor="middle"
              fontSize="10"
              fill="#64748b"
            >
              Total
            </text>
          </svg>
        </div>
        <div className="chart-legend">
          {segments.map((seg) => (
            <div key={seg.label} className="legend-item">
              <div className="legend-bar-wrap">
                <div
                  className="legend-bar"
                  style={{
                    width: `${seg.fraction * 100}%`,
                    background: seg.color,
                  }}
                />
              </div>
              <div className="legend-info">
                <span className="legend-dot" style={{ background: seg.color }} />
                <span className="legend-label">{seg.label}</span>
                <span className="legend-value">{seg.value}</span>
                <span className="legend-pct">{Math.round(seg.fraction * 100)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
