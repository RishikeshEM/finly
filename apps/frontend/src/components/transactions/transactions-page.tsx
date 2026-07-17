'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

export function TransactionsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card className="flex items-center justify-between gap-4">
        <Input
          type="text"
          placeholder="Search transactions..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
        />
        <select className="px-4 py-2 rounded-lg border border-border-light dark:border-border-dark bg-input-bg-light dark:bg-input-bg-dark text-text-light dark:text-text-dark">
          <option value="all">All Categories</option>
          <option value="food">Food & Dining</option>
          <option value="transport">Transport</option>
          <option value="entertainment">Entertainment</option>
        </select>
        <Button variant="primary">Add Transaction</Button>
        <Button variant="outline">Export</Button>
      </Card>

      {/* Transactions Table */}
      <Card className="overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-border-light dark:border-border-dark bg-card-alt-light dark:bg-card-alt-dark">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">Date</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Description</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Category</th>
              <th className="px-6 py-3 text-right text-sm font-semibold">Amount</th>
              <th className="px-6 py-3 text-center text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            <TransactionRow date="2026-07-17" description="Grocery Store" category="Food" amount="-$45.50" />
            <TransactionRow date="2026-07-16" description="Salary Deposit" category="Income" amount="+$2,100.00" />
            <TransactionRow date="2026-07-15" description="Gas Station" category="Transport" amount="-$52.00" />
            <TransactionRow date="2026-07-14" description="Movie Tickets" category="Entertainment" amount="-$25.00" />
          </tbody>
        </table>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-muted-light dark:text-text-muted-dark">
          Showing 1-4 of 248 transactions
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">Previous</Button>
          <Button variant="outline" size="sm">1</Button>
          <Button variant="primary" size="sm">2</Button>
          <Button variant="outline" size="sm">3</Button>
          <Button variant="outline" size="sm">Next</Button>
        </div>
      </div>
    </div>
  );
}

function TransactionRow({ date, description, category, amount }: any) {
  return (
    <tr className="border-b border-border-light dark:border-border-dark hover:bg-hover-bg-light dark:hover:bg-hover-bg-dark">
      <td className="px-6 py-3 text-sm">{date}</td>
      <td className="px-6 py-3 text-sm font-medium">{description}</td>
      <td className="px-6 py-3 text-sm">{category}</td>
      <td className={`px-6 py-3 text-sm font-semibold text-right ${amount.startsWith('+') ? 'text-primary' : 'text-text-light dark:text-text-dark'}`}>
        {amount}
      </td>
      <td className="px-6 py-3 text-center">
        <Button variant="ghost" size="sm" className="text-xs">Edit</Button>
      </td>
    </tr>
  );
}
