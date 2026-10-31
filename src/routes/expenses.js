import { Router } from 'express';
import pool from '../config/db.js';
const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, description, amount, category, created_at FROM expenses WHERE business_id = ? ORDER BY created_at DESC LIMIT 100',
      [req.user.businessId]
    );
    res.json(rows);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const { description, amount, category } = req.body;
    const value = Number(amount);
    if (!description?.trim() || !Number.isFinite(value) || value <= 0) {
      return res.status(400).json({ message: 'Ingresá una descripción y un importe válido.' });
    }
    const [result] = await pool.execute(
      'INSERT INTO expenses (business_id, description, amount, category) VALUES (?, ?, ?, ?)',
      [req.user.businessId, description.trim(), value, category || null]
    );
    res.status(201).json({ id: result.insertId, message: 'Gasto registrado.' });
  } catch (e) { next(e); }
});

export default router;
