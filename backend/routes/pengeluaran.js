import { Router } from 'express';
import { pool } from '../db.js';
const router = Router();

// 1. GET ALL
router.get('/', async (req, res) => { 
  try {
    const [rows] = await pool.query(
      `SELECT p.id, p.judul, p.nominal, p.tanggal, p.catatan, p.id_kategori,
              k.nama AS kategori
       FROM pengeluaran p
       LEFT JOIN kategori k ON p.id_kategori = k.id
       ORDER BY p.tanggal DESC`
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ pesan: 'Gagal mengambil data' });
  }
});

// 2. GET DETAIL (SUDAH DIPERBAIKI: Menggunakan LEFT JOIN agar nama kategori ikut terambil)
router.get('/:id', async (req, res) => { 
  try {
    const [rows] = await pool.query(
      `SELECT p.*, k.nama AS kategori
       FROM pengeluaran p
       LEFT JOIN kategori k ON p.id_kategori = k.id
       WHERE p.id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ pesan: 'Data tidak ditemukan' });
    }
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ pesan: 'Gagal mengambil data' });
  }
});

// 3. POST (SUDAH DIPERBAIKI: Tanda tanya (?, ?, ?, ?) sekarang berjumlah 4)
router.post('/', async (req, res) => {
  const { judul, nominal, id_kategori, catatan } = req.body;
  if (!judul || !nominal) {
    return res.status(400).json({ pesan: 'judul & nominal wajib' });
  }
  try {
    const [hasil] = await pool.query(
      `INSERT INTO pengeluaran (judul, nominal, id_kategori, catatan)
       VALUES (?, ?, ?, ?)`,
      [judul, Number(nominal), id_kategori ?? null, catatan ?? null]
    );
    res.status(201).json({ id: hasil.insertId, judul, nominal });
  } catch (e) {
    console.error(e); // Ditambahkan console.error biar kelihatan di terminal kalau ada error
    res.status(500).json({ pesan: 'Gagal menyimpan data' });
  }
});

// 4. PUT
router.put('/:id', async (req, res) => { 
  const { judul, nominal, catatan } = req.body;
  try {
    const [hasil] = await pool.query(
      'UPDATE pengeluaran SET judul = ?, nominal = ?, catatan = ? WHERE id = ?',
      [judul, Number(nominal), catatan ?? null, req.params.id]
    );
    if (hasil.affectedRows === 0) {
      return res.status(404).json({ pesan: 'Data tidak ditemukan' });
    }
    res.json({ id: Number(req.params.id), judul, nominal: Number(nominal) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ pesan: 'Operasi database gagal' });
  }
});

// 5. DELETE
router.delete('/:id', async (req, res) => {
  try {
    const [hasil] = await pool.query(
      'DELETE FROM pengeluaran WHERE id = ?',
      [req.params.id]
    );
    if (hasil.affectedRows === 0) {
      return res.status(404).json({ pesan: 'Data tidak ditemukan' });
    }
    res.status(204).end();
  } catch (e) {
    console.error(e);
    res.status(500).json({ pesan: 'Operasi database gagal' });
  }
});

export default router;