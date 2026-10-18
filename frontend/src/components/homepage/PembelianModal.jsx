import { useEffect, useState } from 'react';
import { Modal, Table, Button, Form } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { unduhCsv, pembelianKeCsv } from '../../utils/unduhCsv';
import { labelBulan } from '../../utils/dateParse';
import { fetchPembelian } from '../../api/client';

const rp = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(n) || 0);
const angka = (n) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(Number(n) || 0);

// Rincian pembelian outlet: Outlet | Nominal | Kiriman + unduh. Isi unduhan hanya item yang sudah
// disetujui gudang (baris PENUHI = jumlahKirim) dengan format surat jalan; state bulan milik modal.
export default function PembelianModal({ show, onTutup }) {
    const navigate = useNavigate();
    const bulanIni = new Date().toLocaleString('en-CA', { timeZone: 'Asia/Jakarta' }).slice(0, 7);
    const [bulan, setBulan] = useState(''); // 'YYYY-MM', kosong = bulan berjalan
    const [data, setData] = useState(null);
    const [preview, setPreview] = useState(null); // outlet yang sedang dipratinjau

    // 'memuat' diturunkan (bukan state): data yang tampil belum sama dengan bulan diminta.
    const bulanDiminta = bulan || bulanIni;
    const memuat = !data || data.bulan !== bulanDiminta;

    useEffect(() => {
        if (!show) return;
        let batal = false;
        fetchPembelian(bulan)
            .then(d => { if (!batal) setData(d); })
            .catch(() => { if (!batal) setData(null); });
        return () => { batal = true; };
    }, [show, bulan]);

    const daftar = data?.perOutlet || [];
    const periode = labelBulan(data?.bulan);
    // Bulan effective untuk nama file & tautan PDF (state kosong = backend yang membatasi).
    const bulanEfektif = data?.bulan || bulan || bulanIni;

    function namaFile(outlet) {
        const slug = String(outlet).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        return `Pembelian-${slug || 'outlet'}-${bulanEfektif}.csv`;
    }
    function unduh(o) {
        unduhCsv(namaFile(o.outlet), pembelianKeCsv(o.outlet, periode, o.items));
    }
    function cetak(o) {
        navigate(`/surat-jalan/bulanan?bulan=${encodeURIComponent(bulanEfektif)}&outlet=${encodeURIComponent(o.outlet)}`);
    }

    return (
        <>
        <Modal show={show} onHide={onTutup} centered size='lg'>
            <Modal.Header closeButton>
                <Modal.Title className='fs-6'>Pembelian Outlet</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <div className='d-flex gap-2 align-items-end mb-2'>
                    <Form.Group className='flex-fill'>
                        <Form.Label className='text-muted small mb-1'>Bulan (WIB, tanpa masa depan)</Form.Label>
                        <Form.Control type='month' value={bulan} max={bulanIni}
                            onChange={e => { setBulan(e.target.value); setPreview(null); }} />
                    </Form.Group>
                    <Button size='sm' variant='outline-secondary' disabled={bulan === ''}
                        onClick={() => { setBulan(''); setPreview(null); }}>
                        Bulan ini
                    </Button>
                    {memuat && <span className='small text-muted pb-2'>memuat…</span>}
                </div>
                <Table bordered size='sm' className='mb-0'>
                    <thead>
                        <tr>
                            <th>Outlet</th>
                            <th className='text-end'>Nominal</th>
                            <th className='text-end'>Kiriman</th>
                            <th className='text-end'>Unduh</th>
                        </tr>
                    </thead>
                    <tbody>
                        {daftar.map(o => (
                            <tr key={o.outlet}>
                                <td>{o.outlet}</td>
                                <td className='text-end' style={{ fontVariantNumeric: 'tabular-nums' }}>{rp(o.total)}</td>
                                <td className='text-end'>{o.kiriman}</td>
                                <td className='text-end text-nowrap'>
                                    <Button size='sm' variant='outline-primary' className='me-1'
                                        onClick={() => setPreview(o)} disabled={memuat || !(o.items || []).length}
                                        title='Lihat isi CSV sebelum diunduh'>
                                        CSV
                                    </Button>
                                    <Button size='sm' variant='outline-secondary'
                                        onClick={() => cetak(o)} disabled={memuat || !(o.items || []).length}
                                        title='Buka halaman cetak, lalu Simpan PDF'>
                                        PDF
                                    </Button>
                                </td>
                            </tr>
                        ))}
                        {daftar.length === 0 && (
                            <tr>
                                <td colSpan={4} className='text-center text-muted'>
                                    {memuat ? 'Memuat data...' : `Belum ada barang terkirim pada ${periode || 'bulan ini'}.`}
                                </td>
                            </tr>
                        )}
                    </tbody>
                    {daftar.length > 0 && (
                        <tfoot>
                            <tr className='fw-bold'>
                                <td>Total</td>
                                <td className='text-end' style={{ fontVariantNumeric: 'tabular-nums' }}>{rp(data.total)}</td>
                                <td className='text-end'>{data.jumlahKiriman}</td>
                                <td />
                            </tr>
                        </tfoot>
                    )}
                </Table>
                <div className='text-muted mt-2' style={{ fontSize: '11px' }}>
                    Hanya barang yang sudah disetujui gudang (jumlah terkirim), dari harga moving-average terkini.
                    {data?.tanpaHarga > 0 && ` ${data.tanpaHarga} baris tanpa harga tidak dihitung.`}
                </div>
            </Modal.Body>
        </Modal>

        <Modal show={!!preview} onHide={() => setPreview(null)} centered size='xl'>
            <Modal.Header closeButton>
                <Modal.Title className='fs-6'>Preview CSV — {preview?.outlet}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <p className='small text-muted mb-2'>
                    Isi file: {preview?.items.length || 0} baris
                    {periode && ` • periode ${periode}`}
                    {' • '}TOTAL Rp {angka(preview?.total)}
                    {' '}(isi file persis seperti tabel ini).
                </p>
                <div style={{ maxHeight: '55vh', overflowY: 'auto' }}>
                    <Table striped bordered hover size='sm' className='mb-0'>
                        <thead>
                            <tr>
                                <th>No</th>
                                <th>ID Kirim</th>
                                <th>Tgl Kirim</th>
                                <th>Nama Barang</th>
                                <th>Note</th>
                                <th className='text-end'>Qty</th>
                                <th>Satuan</th>
                                <th className='text-end'>Harga</th>
                                <th className='text-end'>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(preview?.items || []).map((it, i) => (
                                <tr key={`${it.idKirim}-${i}`}>
                                    <td>{i + 1}</td>
                                    <td style={{ fontSize: '11px' }}>{it.idKirim}</td>
                                    <td>{it.tglKirim}</td>
                                    <td>{it.nama}</td>
                                    <td style={{ fontSize: '11px' }}>{it.note}</td>
                                    <td className='text-end'>{angka(it.qty)}</td>
                                    <td>{it.satuan}</td>
                                    <td className='text-end'>{it.harga != null ? angka(it.harga) : '-'}</td>
                                    <td className='text-end'>{it.total != null ? angka(it.total) : '-'}</td>
                                </tr>
                            ))}
                            {(preview?.items || []).length === 0 && (
                                <tr><td colSpan={9} className='text-center text-muted'>Kosong.</td></tr>
                            )}
                        </tbody>
                    </Table>
                </div>
            </Modal.Body>
            <Modal.Footer className='justify-content-between'>
                <span className='text-muted small'>{preview ? namaFile(preview.outlet) : ''}</span>
                <Button variant='primary' disabled={!preview} onClick={() => unduh(preview)}>
                    Unduh CSV
                </Button>
            </Modal.Footer>
        </Modal>
        </>
    );
}