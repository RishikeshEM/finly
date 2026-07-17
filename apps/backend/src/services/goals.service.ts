import { pool } from '../db';
import { invalidateDashboardCache } from './cache.service';
import { checkGoalProgressTrigger } from './notifications.service';

export async function createGoal(userId: string, name: string, targetCents: number, deadline: string, monthlyContributionCents?: number) {
  const result = await pool.query(
    `INSERT INTO goals (user_id, name, target_cents, deadline, monthly_contribution_cents)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [userId, name, targetCents, deadline, monthlyContributionCents || 0]
  );
  const goal = result.rows[0];
  await pool.query(
    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, diff) VALUES ($1, $2, $3, $4, $5)`,
    [userId, 'create', 'goal', goal.id, JSON.stringify({ name, target_cents: targetCents })]
  );
  await invalidateDashboardCache(userId);
  return goal;
}

export async function getGoals(userId: string) {
  const result = await pool.query(
    `SELECT id, user_id, name, target_cents, current_cents, deadline, monthly_contribution_cents, version, updated_at FROM goals WHERE user_id = $1 ORDER BY deadline ASC`,
    [userId]
  );
  return result.rows.map(g => ({
    ...g,
    progress_percentage: Math.round((g.current_cents / g.target_cents) * 100)
  }));
}

export async function updateGoal(userId: string, goalId: string, updates: any) {
  const client = await pool.connect();
  try {
    const current = await client.query(`SELECT * FROM goals WHERE id = $1 AND user_id = $2`, [goalId, userId]);
    if (current.rows.length === 0) throw new Error('Goal not found');

    const fields: string[] = [];
    const values: any[] = [];
    let i = 1;

    if (updates.current_cents !== undefined) { fields.push(`current_cents = $${i++}`); values.push(updates.current_cents); }
    if (updates.monthly_contribution_cents !== undefined) { fields.push(`monthly_contribution_cents = $${i++}`); values.push(updates.monthly_contribution_cents); }
    if (updates.name !== undefined) { fields.push(`name = $${i++}`); values.push(updates.name); }

    values.push(goalId); values.push(userId);
    const result = await client.query(`UPDATE goals SET ${fields.join(', ')}, version = version + 1, updated_at = NOW() WHERE id = $${i} AND user_id = $${i+1} RETURNING *`, values);

    await client.query(`INSERT INTO audit_logs (user_id, action, entity_type, entity_id, diff) VALUES ($1, $2, $3, $4, $5)`,
      [userId, 'update', 'goal', goalId, JSON.stringify(updates)]);

    await invalidateDashboardCache(userId);

    if (updates.current_cents !== undefined) {
      checkGoalProgressTrigger(userId, goalId).catch((err) =>
        console.warn('Goal progress trigger check failed:', err.message)
      );
    }

    return result.rows[0];
  } finally { client.release(); }
}

export async function deleteGoal(userId: string, goalId: string) {
  await pool.query(`DELETE FROM goals WHERE id = $1 AND user_id = $2`, [goalId, userId]);
  await pool.query(`INSERT INTO audit_logs (user_id, action, entity_type, entity_id, diff) VALUES ($1, $2, $3, $4, $5)`,
    [userId, 'delete', 'goal', goalId, JSON.stringify({})]);
  await invalidateDashboardCache(userId);
}
