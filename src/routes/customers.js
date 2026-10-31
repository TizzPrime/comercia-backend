import { Router } from 'express';
import pool from '../config/db.js';
const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, name, phone, email, notes, created_at FROM customers WHERE business_id = ? ORDER BY name',
      [req.user.businessId]
    );
    res.json(rows);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, phone, email, notes } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'El nombre es obligatorio.' });
    const [result] = await pool.execute(
      'INSERT INTO customers (business_id, name, phone, email, notes) VALUES (?, ?, ?, ?, ?)',
      [req.user.businessId, name.trim(), phone || null, email || null, notes || null]
    );
    res.status(201).json({ id: result.insertId, message: 'Cliente creado.' });
  } catch (e) { next(e); }
});

export default router;
