/**
 * Transactions Service
 * CRUD operations for transactions and categories
 */

import { pool } from '../db';
import { invalidateDashboardCache, getIdempotentResourceId, setIdempotentResourceId } from './cache.service';
import { checkBudgetAlertTrigger } from './notifications.service';

export interface Transaction {
  id: string;
  account_id: string;
  category_id: string;
  type: 'income' | 'expense';
  amount_cents: number;
  date: string;
  notes?: string;
  payment_method?: string;
  recurring: boolean;
  recurrence_rule?: string;
}

export interface Category {
  id: string;
  user_id?: string;
  name: string;
  icon?: string;
}

/**
 * Create a transaction with idempotency key support (BE-EC-01)
 */
export async function createTransaction(
  userId: string,
  accountId: string,
  categoryId: string,
  type: 'income' | 'expense',
  amountCents: number,
  date: string,
  idempotencyKey: string,
  notes?: string,
  paymentMethod?: string,
  recurring?: boolean,
  recurrenceRule?: string
): Promise<Transaction> {
  const idempotencyScope = `transaction:${accountId}`;

  // Check for duplicate submission via idempotency key (BE-EC-01)
  const existingId = await getIdempotentResourceId(idempotencyScope, idempotencyKey);
  if (existingId) {
    const existingResult = await pool.query(
      'SELECT id, account_id, category_id, type, amount_cents, date, notes, payment_method, recurring, recurrence_rule FROM transactions WHERE id = $1',
      [existingId]
    );
    if (existingResult.rows.length > 0) {
      return existingResult.rows[0];
    }
    // Idempotency record pointed at a since-deleted transaction; fall through and create fresh.
  }

  // Validate amount is positive integer
  if (amountCents <= 0 || !Number.isInteger(amountCents)) {
    throw new Error('Amount must be a positive integer (cents)');
  }

  const client = await pool.connect();

  try {
    // Create transaction
    const result = await client.query(
      `INSERT INTO transactions (account_id, category_id, type, amount_cents, date, notes, payment_method, recurring, recurrence_rule)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, account_id, category_id, type, amount_cents, date, notes, payment_method, recurring, recurrence_rule`,
      [accountId, categoryId, type, amountCents, date, notes, paymentMethod, recurring || false, recurrenceRule]
    );

    const transaction = result.rows[0];

    await setIdempotentResourceId(idempotencyScope, idempotencyKey, transaction.id);

    // Audit log
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, diff)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, 'create', 'transaction', transaction.id, JSON.stringify({ type, amount_cents: amountCents, category_id: categoryId })]
    );

    await invalidateDashboardCache(userId);

    // Non-blocking: budget alert trigger check (backend-spec §2.8)
    checkBudgetAlertTrigger(userId, categoryId).catch((err) =>
      console.warn('Budget alert trigger check failed:', err.message)
    );

    return transaction;
  } finally {
    client.release();
  }
}

/**
 * Get transactions for user's accounts, with a total count for pagination
 * (frontend needs this to detect a deep link past the last page, FE-EC-09).
 */
export async function getTransactions(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<{ transactions: Transaction[]; total: number }> {
  const [result, countResult] = await Promise.all([
    pool.query(
      `SELECT t.id, t.account_id, t.category_id, t.type, t.amount_cents, t.date, t.notes, t.payment_method, t.recurring, t.recurrence_rule
       FROM transactions t
       JOIN accounts a ON t.account_id = a.id
       WHERE a.user_id = $1
       ORDER BY t.date DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    ),
    pool.query(
      `SELECT COUNT(*) as total FROM transactions t JOIN accounts a ON t.account_id = a.id WHERE a.user_id = $1`,
      [userId]
    ),
  ]);

  return { transactions: result.rows, total: parseInt(countResult.rows[0].total) };
}

/**
 * Update a transaction
 */
export async function updateTransaction(
  userId: string,
  transactionId: string,
  updates: Partial<Transaction>
): Promise<Transaction> {
  const client = await pool.connect();

  try {
    // Verify user owns this transaction
    const verifyResult = await client.query(
      `SELECT t.id FROM transactions t
       JOIN accounts a ON t.account_id = a.id
       WHERE t.id = $1 AND a.user_id = $2`,
      [transactionId, userId]
    );

    if (verifyResult.rows.length === 0) {
      throw new Error('Transaction not found');
    }

    // Build update query
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.amount_cents !== undefined) {
      updateFields.push(`amount_cents = $${paramCount}`);
      values.push(updates.amount_cents);
      paramCount++;
    }

    if (updates.category_id !== undefined) {
      updateFields.push(`category_id = $${paramCount}`);
      values.push(updates.category_id);
      paramCount++;
    }

    if (updates.notes !== undefined) {
      updateFields.push(`notes = $${paramCount}`);
      values.push(updates.notes);
      paramCount++;
    }

    if (updateFields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(transactionId);

    const updateQuery = `UPDATE transactions SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = $${paramCount} RETURNING id, account_id, category_id, type, amount_cents, date, notes, payment_method, recurring, recurrence_rule`;

    const result = await client.query(updateQuery, values);
    const transaction = result.rows[0];

    // Audit log
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, diff)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, 'update', 'transaction', transactionId, JSON.stringify(updates)]
    );

    await invalidateDashboardCache(userId);

    return transaction;
  } finally {
    client.release();
  }
}

/**
 * Delete a transaction
 */
export async function deleteTransaction(userId: string, transactionId: string): Promise<void> {
  const client = await pool.connect();

  try {
    // Verify user owns this transaction
    const verifyResult = await client.query(
      `SELECT t.id FROM transactions t
       JOIN accounts a ON t.account_id = a.id
       WHERE t.id = $1 AND a.user_id = $2`,
      [transactionId, userId]
    );

    if (verifyResult.rows.length === 0) {
      throw new Error('Transaction not found');
    }

    await client.query('DELETE FROM transactions WHERE id = $1', [transactionId]);

    // Audit log
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, diff)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, 'delete', 'transaction', transactionId, JSON.stringify({})]
    );

    await invalidateDashboardCache(userId);
  } finally {
    client.release();
  }
}

/**
 * Create a category
 */
export async function createCategory(userId: string, name: string, icon?: string): Promise<Category> {
  const result = await pool.query(
    `INSERT INTO categories (user_id, name, icon)
     VALUES ($1, $2, $3)
     RETURNING id, user_id, name, icon`,
    [userId, name, icon]
  );

  const category = result.rows[0];

  await pool.query(
    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, diff) VALUES ($1, $2, $3, $4, $5)`,
    [userId, 'create', 'category', category.id, JSON.stringify({ name, icon })]
  );

  return category;
}

/**
 * Get user's categories (including system defaults)
 */
export async function getCategories(userId: string): Promise<Category[]> {
  const result = await pool.query(
    `SELECT id, user_id, name, icon FROM categories
     WHERE user_id = $1 OR user_id IS NULL
     ORDER BY user_id DESC, name ASC`,
    [userId]
  );

  return result.rows;
}

/**
 * Update a category
 */
export async function updateCategory(userId: string, categoryId: string, name?: string, icon?: string): Promise<Category> {
  // Verify user owns this category
  const verifyResult = await pool.query(
    'SELECT id FROM categories WHERE id = $1 AND user_id = $2',
    [categoryId, userId]
  );

  if (verifyResult.rows.length === 0) {
    throw new Error('Category not found');
  }

  const updates: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  if (name !== undefined) {
    updates.push(`name = $${paramCount}`);
    values.push(name);
    paramCount++;
  }

  if (icon !== undefined) {
    updates.push(`icon = $${paramCount}`);
    values.push(icon);
    paramCount++;
  }

  values.push(categoryId);

  const updateQuery = `UPDATE categories SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING id, user_id, name, icon`;

  const result = await pool.query(updateQuery, values);
  const category = result.rows[0];

  await pool.query(
    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, diff) VALUES ($1, $2, $3, $4, $5)`,
    [userId, 'update', 'category', categoryId, JSON.stringify({ name, icon })]
  );

  return category;
}

/**
 * Delete a category (BE-EC-07: policy decision needed)
 * For MVP: block deletion if transactions reference it
 */
export async function deleteCategory(userId: string, categoryId: string): Promise<void> {
  const client = await pool.connect();

  try {
    // Verify user owns this category
    const verifyResult = await client.query(
      'SELECT id FROM categories WHERE id = $1 AND user_id = $2',
      [categoryId, userId]
    );

    if (verifyResult.rows.length === 0) {
      throw new Error('Category not found');
    }

    // Check if category is referenced by transactions or budgets (BE-EC-07)
    const referencesResult = await client.query(
      `SELECT COUNT(*) as count FROM transactions WHERE category_id = $1
       UNION ALL
       SELECT COUNT(*) as count FROM budgets WHERE category_id = $1`,
      [categoryId]
    );

    const totalReferences = referencesResult.rows.reduce((sum, row) => sum + parseInt(row.count), 0);

    if (totalReferences > 0) {
      throw new Error('Cannot delete category with existing transactions or budgets. Please reassign them first.');
    }

    await client.query('DELETE FROM categories WHERE id = $1', [categoryId]);

    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, diff) VALUES ($1, $2, $3, $4, $5)`,
      [userId, 'delete', 'category', categoryId, JSON.stringify({})]
    );
  } finally {
    client.release();
  }
}
