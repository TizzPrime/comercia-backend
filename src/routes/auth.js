import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

const router = Router();

const makeSlug = (value) => value.toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 120);

router.post('/register', async (req, res, next) => {
  const { businessName, name, email, password } = req.body;
  if (!businessName?.trim() || !name?.trim() || !email?.trim() || !password || password.length < 8) {
    return res.status(400).json({ message: 'Completá todos los campos. La contraseña debe tener al menos 8 caracteres.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    let slug = makeSlug(businessName) || 'comercio';
    slug = `${slug}-${Date.now().toString().slice(-6)}`;
    const [business] = await connection.execute(
      'INSERT INTO businesses (name, slug) VALUES (?, ?)', [businessName.trim(), slug]
    );
    const hash = await bcrypt.hash(password, 12);
    const [user] = await connection.execute(
      'INSERT INTO users (business_id, name, email, password_hash) VALUES (?, ?, ?, ?)',
      [business.insertId, name.trim(), email.trim().toLowerCase(), hash]
    );
    await connection.commit();
    const payload = { userId: user.insertId, businessId: business.insertId, name: name.trim(), businessName: businessName.trim(), role: 'owner' };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '12h' });
    res.status(201).json({ token, user: payload });
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Ese correo ya está registrado.' });
    next(error);
  } finally {
    connection.release();
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Ingresá correo y contraseña.' });
    const [rows] = await pool.execute(
      `SELECT u.id, u.business_id, u.name, u.email, u.password_hash, u.role, b.name AS business_name
       FROM users u JOIN businesses b ON b.id = u.business_id WHERE u.email = ? LIMIT 1`,
      [email.trim().toLowerCase()]
    );
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ message: 'Correo o contraseña incorrectos.' });
    }
    const payload = { userId: user.id, businessId: user.business_id, name: user.name, businessName: user.business_name, role: user.role };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '12h' });
    res.json({ token, user: payload });
  } catch (error) { next(error); }
});

export default router;
