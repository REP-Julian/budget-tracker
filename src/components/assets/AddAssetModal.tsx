import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { AssetClass } from '../../types';

interface AddAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  currencySymbol?: string;
  onSubmit: (data: {
    name: string;
    assetClass: AssetClass;
    value: number;
    notes?: string;
  }) => void;
}

export const AddAssetModal: React.FC<AddAssetModalProps> = ({
  isOpen,
  onClose,
  currencySymbol = '$',
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [assetClass, setAssetClass] = useState<AssetClass>('investment');
  const [value, setValue] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(value);
    if (!name.trim()) {
      setError('Asset name required');
      return;
    }
    if (isNaN(val) || val <= 0) {
      setError('Enter valid asset valuation');
      return;
    }
    onSubmit({
      name,
      assetClass,
      value: val,
      notes: notes || undefined,
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Add Asset</div>
          <button className="icon-circle-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {error && (
          <div style={{ color: 'var(--accent-pink)', fontSize: '11px', marginBottom: '10px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">Asset Name</label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g., Ethereum (ETH), Tesla Stock, Motorcycle"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label">Asset Class</label>
            <select
              className="input-field"
              value={assetClass}
              onChange={(e) => setAssetClass(e.target.value as AssetClass)}
            >
              <option value="investment">Stocks & Index Funds</option>
              <option value="crypto">Cryptocurrency</option>
              <option value="physical">Physical Property & Vehicles</option>
            </select>
          </div>

          <div className="input-group">
            <label className="input-label">Current Valuation ({currencySymbol})</label>
            <input
              type="number"
              step="0.01"
              className="input-field"
              placeholder="5000.00"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label">Notes (Optional)</label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g., Ledger wallet cold storage"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <button type="submit" className="btn-primary" style={{ marginTop: '14px' }}>
            <Check size={16} /> Save Asset
          </button>
        </form>
      </div>
    </div>
  );
};
