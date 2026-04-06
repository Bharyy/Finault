import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { CategoryTotal } from '@/api/dashboard.api';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316', '#14b8a6', '#64748b'];

export default function CategoryPie({ data }: { data: CategoryTotal[] }) {
  const chartData = data
    .filter((d) => d.expense > 0)
    .slice(0, 8)
    .map((d) => ({
      name: d.category,
      value: d.expense,
    }));

  return (
    <div className="bg-surface rounded-xl border border-border p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-text mb-4">Expense by Category</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Expense']}
              contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
            />
            <Legend
              layout="vertical"
              align="right"
              verticalAlign="middle"
              iconType="circle"
              iconSize={8}
              formatter={(value) => <span className="text-xs text-text-secondary">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
