import { Router } from 'express';
import pool from '../config/db.js';
const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT o.id, o.total, o.status, o.created_at, c.name AS customer_name
       FROM orders o LEFT JOIN customers c ON c.id = o.customer_id
       WHERE o.business_id = ? ORDER BY o.created_at DESC LIMIT 100`,
      [req.user.businessId]
    );
    res.json(rows);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  const { productId, quantity, customerId } = req.body;
  const qty = Number(quantity);
  if (!productId || !Number.isInteger(qty) || qty < 1) {
    return res.status(400).json({ message: 'Seleccioná un producto y una cantidad válida.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [products] = await connection.execute(
      'SELECT id, name, price, stock FROM products WHERE id = ? AND business_id = ? AND active = 1 FOR UPDATE',
      [productId, req.user.businessId]
    );
    const product = products[0];
    if (!product) {
      await connection.rollback();
      return res.status(404).json({ message: 'Producto no encontrado.' });
    }
    if (product.stock < qty) {
      await connection.rollback();
      return res.status(400).json({ message: 'No hay stock suficiente.' });
    }
    if (customerId) {
      const [customers] = await connection.execute(
        'SELECT id FROM customers WHERE id = ? AND business_id = ?',
        [customerId, req.user.businessId]
      );
      if (!customers.length) {
        await connection.rollback();
        return res.status(400).json({ message: 'Cliente inválido.' });
      }
    }
    const total = Number(product.price) * qty;
    const [order] = await connection.execute(
      'INSERT INTO orders (business_id, customer_id, total, status) VALUES (?, ?, ?, ?)',
      [req.user.businessId, customerId || null, total, 'completed']
    );
    await connection.execute(
      'INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?, ?)',
      [order.insertId, product.id, product.name, qty, product.price, total]
    );
    await connection.execute('UPDATE products SET stock = stock - ? WHERE id = ?', [qty, product.id]);
    await connection.commit();
    res.status(201).json({ id: order.insertId, total, message: 'Venta registrada.' });
  } catch (e) {
    await connection.rollback();
    next(e);
  } finally { connection.release(); }
});

export default router;
