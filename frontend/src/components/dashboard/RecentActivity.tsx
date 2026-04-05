import { formatCurrency, formatDate } from '../../lib/utils';

interface ActivityItem {
  id: string;
  amount: string | number;
  type: string;
  category: string;
  date: string;
  notes: string | null;
  user?: { id: string; name: string };
}

export default function RecentActivity({ data }: { data: ActivityItem[] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
      <div className="space-y-3">
        {data.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-4">No transactions yet</p>
        )}
        {data.map((item) => (
          <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${item.type === 'INCOME' ? 'bg-green-500' : 'bg-red-500'}`} />
              <div>
                <p className="text-sm font-medium text-gray-900">{item.category}</p>
                <p className="text-xs text-gray-500">{formatDate(item.date)}</p>
              </div>
            </div>
            <span className={`text-sm font-semibold ${item.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
              {item.type === 'INCOME' ? '+' : '-'}{formatCurrency(Number(item.amount))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
