import React from 'react';
import { MinusCircle, PlusCircle, Handshake } from 'lucide-react';

interface QuickActionsProps {
  onAddExpense: () => void;
  onAddIncome: () => void;
  onLendMoney: () => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onAddExpense,
  onAddIncome,
  onLendMoney,
}) => {
  return (
    <div className="quick-actions-row">
      <button className="quick-action-pill expense" onClick={onAddExpense}>
        <MinusCircle size={15} color="#F43F5E" />
        <span>Expense</span>
      </button>

      <button className="quick-action-pill income" onClick={onAddIncome}>
        <PlusCircle size={15} color="#22C55E" />
        <span>Income</span>
      </button>

      <button className="quick-action-pill lend" onClick={onLendMoney}>
        <Handshake size={15} color="#06B6D4" />
        <span>Lend</span>
      </button>
    </div>
  );
};
