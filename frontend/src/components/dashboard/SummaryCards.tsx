import { TrendingUp, TrendingDown, Wallet, ArrowRightLeft } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface Props {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  totalTransactions: number;
}

export default function SummaryCards({ totalIncome, totalExpenses, netBalance, totalTransactions }: Props) {
  const cards = [
    {
      title: 'Total Income',
      value: formatCurrency(totalIncome),
      icon: TrendingUp,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
    },
    {
      title: 'Total Expenses',
      value: formatCurrency(totalExpenses),
      icon: TrendingDown,
      color: 'text-red-500',
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
    },
    {
      title: 'Net Balance',
      value: formatCurrency(netBalance),
      icon: Wallet,
      color: netBalance >= 0 ? 'text-blue-500' : 'text-red-500',
      bg: netBalance >= 0 ? 'bg-blue-500/10' : 'bg-red-500/10',
      border: netBalance >= 0 ? 'border-blue-500/20' : 'border-red-500/20',
    },
    {
      title: 'Transactions',
      value: totalTransactions.toString(),
      icon: ArrowRightLeft,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.title}
          className={`bg-surface rounded-xl border ${card.border} p-5 shadow-sm`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-text-secondary">{card.title}</span>
            <div className={`p-2 rounded-lg ${card.bg}`}>
              <card.icon className={`w-4 h-4 ${card.color}`} />
            </div>
          </div>
          <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
        </div>
      ))}
    </div>
  );
}
