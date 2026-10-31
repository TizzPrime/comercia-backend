import { Router } from 'express';
import pool from '../config/db.js';
const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, name, sku, description, price, stock, active, created_at FROM products WHERE business_id = ? ORDER BY created_at DESC',
      [req.user.businessId]
    );
    res.json(rows);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, sku, description, price, stock } = req.body;
    const numericPrice = Number(price);
    const numericStock = Number(stock);
    if (!name?.trim() || !Number.isFinite(numericPrice) || numericPrice < 0 || !Number.isInteger(numericStock) || numericStock < 0) {
      return res.status(400).json({ message: 'Revisá nombre, precio y stock.' });
    }
    const [result] = await pool.execute(
      'INSERT INTO products (business_id, name, sku, description, price, stock) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.businessId, name.trim(), sku || null, description || null, numericPrice, numericStock]
    );
    res.status(201).json({ id: result.insertId, message: 'Producto creado.' });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Ese SKU ya existe en tu comercio.' });
    next(e);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const [result] = await pool.execute(
      'UPDATE products SET active = 0 WHERE id = ? AND business_id = ?',
      [req.params.id, req.user.businessId]
    );
    if (!result.affectedRows) return res.status(404).json({ message: 'Producto no encontrado.' });
    res.json({ message: 'Producto archivado.' });
  } catch (e) { next(e); }
});

export default router;
