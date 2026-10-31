import { Router } from 'express';
import pool from '../config/db.js';
const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const businessId = req.user.businessId;
    const [[sales]] = await pool.execute(
      `SELECT COALESCE(SUM(total), 0) AS total, COUNT(*) AS count
       FROM orders WHERE business_id = ? AND status = 'completed' AND DATE(created_at) = CURDATE()`,
      [businessId]
    );
    const [[expenses]] = await pool.execute(
      'SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE business_id = ? AND DATE(created_at) = CURDATE()',
      [businessId]
    );
    const [[products]] = await pool.execute(
      'SELECT COUNT(*) AS count FROM products WHERE business_id = ? AND active = 1',
      [businessId]
    );
    const [[lowStock]] = await pool.execute(
      'SELECT COUNT(*) AS count FROM products WHERE business_id = ? AND active = 1 AND stock <= 5',
      [businessId]
    );
    const [[customers]] = await pool.execute(
      'SELECT COUNT(*) AS count FROM customers WHERE business_id = ?',
      [businessId]
    );
    res.json({
      salesToday: Number(sales.total),
      ordersToday: Number(sales.count),
      expensesToday: Number(expenses.total),
      balanceToday: Number(sales.total) - Number(expenses.total),
      products: Number(products.count),
      lowStock: Number(lowStock.count),
      customers: Number(customers.count)
    });
  } catch (e) { next(e); }
});

export default router;
