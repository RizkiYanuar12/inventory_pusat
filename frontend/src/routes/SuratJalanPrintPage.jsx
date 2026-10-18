import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Container, Button, Alert, Table } from 'react-bootstrap';
import { ArrowLeft } from 'lucide-react';
import { lihatSuratJalan, lihatSuratJalanPesanan, lihatSuratJalanBulanan } from '../api/client';

const rp = (n) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(Number(n) || 0);
const NBSP = String.fromCharCode(160); // spasi non-putus untuk sel coret kosong

// Sel baris tolak: isi dibungkus span jangkar garis coret overlay (lihat App.css).
// Sel kosong diisi nbsp agar segmen garis tetap ada (tidak terlihat, hanya garis).
function selCoret(ditolak, isi, cls) {
    if (!ditolak) return <td className={cls}>{isi}</td>;
    const tampil = isi === '' || isi == null ? NBSP : isi;
    return <td className={cls}><span className='sj-isi'>{tampil}</span></td>;
}

// Surat jalan cetak: A4 portrait, print manual. Tiga pintu — /surat-jalan/:idKirim,
// /surat-jalan/pesanan/:idPesan, /surat-jalan/bulanan?bulan=&outlet= (item yang disetujui gudang).
export default function SuratJalanPrintPage() {
    const { idKirim, idPesan } = useParams();
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const bulan = params.get('bulan');
    const outlet = params.get('outlet');
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        const p = bulan && outlet ? lihatSuratJalanBulanan(outlet, bulan)
            : (idPesan ? lihatSuratJalanPesanan(idPesan) : lihatSuratJalan(idKirim));
        p.then(setData).catch(e => setError(e.message));
    }, [idKirim, idPesan, bulan, outlet]);

    if (error) return <Container className='py-5 text-center'><Alert variant='danger'>{error}</Alert></Container>;
    if (!data) return <p className='text-center py-5 text-muted'>Memuat surat jalan...</p>;
    // Dokumen gabungan beberapa paket: kolom tanda tangan tidak relevan.
    const tanpaCheck = !!data.sembunyiChecklist;

    // Dibuka dari hub/dashboard lewat navigasi dalam aplikasi; fallback ke hub bila tanpa riwayat.
    function kembali() {
        if (window.history.length > 1) navigate(-1);
        else navigate('/pesanan');
    }

    return (
        <Container className='py-4 surat-jalan'>
            <div className='d-flex justify-content-between align-items-center mb-3 no-print'>
                <div className='d-flex align-items-center gap-2'>
                    <Button size='sm' variant='outline-secondary' onClick={kembali}
                        className='d-flex align-items-center gap-1' title='Kembali ke halaman sebelumnya'>
                        <ArrowLeft size={16} /> Kembali
                    </Button>
                    <strong className='small text-muted'>{data.idKirim}</strong>
                </div>
                <Button size='sm' variant='primary' onClick={() => window.print()}>Print / Simpan PDF</Button>
            </div>

            <h2 className='text-center fw-bold mb-3' style={{ fontSize: '18px' }}>
                SURAT JALAN - {String(data.outlet || '').toUpperCase()}
            </h2>

            <div className='d-flex justify-content-between mb-3 sj-info'>
                <table className='sj-box'>
                    <tbody>
                        <tr><th colSpan={2}>Tanggal</th></tr>
                        <tr><td>{data.labelPesan || 'Pemesan'}</td><td>{data.labelKirim || 'Pengiriman'}</td></tr>
                        <tr><td>{data.tglPesan}</td><td>{data.tglKirim}</td></tr>
                    </tbody>
                </table>
                <table className='sj-box'>
                    <tbody>
                        <tr><th>Barang</th><td rowSpan={2}>{data.outlet}</td></tr>
                        <tr><th>Outlet</th></tr>
                    </tbody>
                </table>
            </div>

            <Table bordered size='sm' className='sj-tabel mb-1'>
                <colgroup>
                    <col style={{ width: '13%' }} />
                    <col />
                    <col style={{ width: '9%' }} />
                    <col style={{ width: '6%' }} />
                    <col style={{ width: '7%' }} />
                    <col style={{ width: '11%' }} />
                    <col style={{ width: '12%' }} />
                    {!tanpaCheck && <col style={{ width: '5%' }} />}
                    {!tanpaCheck && <col style={{ width: '5%' }} />}
                    {!tanpaCheck && <col style={{ width: '5%' }} />}
                </colgroup>
                <thead>
                    <tr>
                        <th rowSpan={2}>Outlet</th>
                        <th rowSpan={2}>Nama Barang</th>
                        <th rowSpan={2}>Note</th>
                        <th rowSpan={2}>Qty</th>
                        <th rowSpan={2}>Sat.</th>
                        <th rowSpan={2}>Harga</th>
                        <th rowSpan={2}>Total</th>
                        {!tanpaCheck && <th colSpan={3} className='sj-check'>Checklist</th>}
                    </tr>
                    {!tanpaCheck && (
                        <tr>
                            <th className='sj-check'>Proc.</th>
                            <th className='sj-check'>Driver</th>
                            <th className='sj-check'>Outlet</th>
                        </tr>
                    )}
                </thead>
                <tbody>
                    {data.items.map(it => (
                        <tr key={it.no} className={it.ditolak ? 'text-muted sj-coret' : ''}>
                            {selCoret(it.ditolak, it.outlet)}
                            {selCoret(it.ditolak, it.nama)}
                            {selCoret(it.ditolak, it.note)}
                            {selCoret(it.ditolak, it.qty, 'text-end')}
                            {selCoret(it.ditolak, it.satuan)}
                            {selCoret(it.ditolak, it.ditolak ? '-' : rp(it.harga), 'text-end')}
                            {selCoret(it.ditolak, it.ditolak ? '-' : rp(it.total), 'text-end')}
                            {!tanpaCheck && selCoret(it.ditolak, undefined, 'sj-check')}
                            {!tanpaCheck && selCoret(it.ditolak, undefined, 'sj-check')}
                            {!tanpaCheck && selCoret(it.ditolak, undefined, 'sj-check')}
                        </tr>
                    ))}
                    <tr className='fw-bold'>
                        <td colSpan={6} className='text-center'>GRAND TOTAL</td>
                        <td className='text-end'>{rp(data.grandTotal)}</td>
                        <td colSpan={tanpaCheck ? 0 : 3} />
                    </tr>
                </tbody>
            </Table>
            {data.items.some(it => it.ditolak) && (
                <div className='small text-muted'>* dicoret = ditolak gudang (tidak dikirim, tidak dihitung).</div>
            )}
            {data.adaTanpaHarga && (
                <div className='small text-muted mb-2'>* ada item belum ada harga (dihitung 0).</div>
            )}

            <div className='d-flex justify-content-around text-center mt-4'>
                <div>Penerima<br /><br /><br />( &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; )</div>
                <div>PIC Pengirim<br /><br /><br />( &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; )</div>
            </div>
        </Container>
    );
}
