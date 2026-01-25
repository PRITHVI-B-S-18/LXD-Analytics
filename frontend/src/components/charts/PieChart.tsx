import { PieChart as RechartsPie, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface PieChartProps {
  data: { name: string; value: number }[];
  colors?: string[];
}

const DEFAULT_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const STATUS_COLORS: Record<string, string> = {
  Completed: '#10B981',
  Ongoing: '#F59E0B',
  Upcoming: '#3B82F6',
};

// Custom label renderer that truncates long names
const renderCustomLabel = ({ name, percent, cx, cy, midAngle, outerRadius }: {
  name: string;
  percent: number;
  cx: number;
  cy: number;
  midAngle: number;
  outerRadius: number;
}) => {
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 25;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  
  // Truncate name if too long
  const displayName = name.length > 18 ? name.substring(0, 16) + '...' : name;
  const percentText = `${(percent * 100).toFixed(0)}%`;
  
  return (
    <text
      x={x}
      y={y}
      fill="#374151"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      fontSize={12}
      fontWeight={500}
    >
      {`${displayName} ${percentText}`}
    </text>
  );
};

export default function PieChart({ data, colors }: PieChartProps) {
  const getColor = (entry: { name: string }, index: number) => {
    if (STATUS_COLORS[entry.name]) return STATUS_COLORS[entry.name];
    return colors?.[index] || DEFAULT_COLORS[index % DEFAULT_COLORS.length];
  };

  return (
    <ResponsiveContainer width="100%" height={320}>
      <RechartsPie margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
        <Pie
          data={data}
          cx="50%"
          cy="45%"
          innerRadius={50}
          outerRadius={80}
          paddingAngle={2}
          dataKey="value"
          label={renderCustomLabel}
          labelLine={{
            stroke: '#9ca3af',
            strokeWidth: 1,
          }}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getColor(entry, index)} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => [value, 'Count']}
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
          }}
        />
        <Legend 
          wrapperStyle={{ paddingTop: '10px' }}
          formatter={(value: string) => (
            <span style={{ color: '#374151', fontSize: '12px' }}>
              {value.length > 20 ? value.substring(0, 18) + '...' : value}
            </span>
          )}
        />
      </RechartsPie>
    </ResponsiveContainer>
  );
}
