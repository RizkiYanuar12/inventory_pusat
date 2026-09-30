import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Container, Card, Button, Form, Table, Alert, Badge } from 'react-bootstrap';
import { fetchOpname, fetchOpnameDetail, fetchOpnameRingkas, mulaiOpname, hitungOpname, reviewOpname, putusOpname, batalOpname, kembaliOpname } from '../api/client';
import { usePagination } from '../hooks/usePagination';
import { opsiKategori } from '../utils/kategori';

const rp = (n) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(Number(n) || 0);

// Opname sesi massal: HITUNG (input fisik) -> REVIEW (4 kolom) -> PUTUS -> SELESAI.
export default function OpnamePage() {
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const [daftar, setDaftar] = useState([]);
    const [buka, setBuka] = useState(null); // detail sesi terbuka
    const [pesan, setPesan] = useState('');
    const [sibuk, setSibuk] = useState(false);
    const [cari, setCari] = useState('');
    const [draf, setDraf] = useState({}); // {idBarang: 'fisik'}
    const [kotor, setKotor] = useState({}); // {idBarang: true} = belum tersimpan di HP ini
    const [katAktif, setKatAktif] = useState(null); // null = semua kategori
    const fokusRef = useRef(''); // baris sedang diketik: tak boleh ditimpa poll
    const kotorRef = useRef({});
    kotorRef.current = kotor;
    const bukaRef = useRef(null);
    bukaRef.current = buka;

    const muatDaftar = useCallback(async () => {
        try { setDaftar(await fetchOpname()); } catch { setDaftar([]); }
    }, []);

    // Gabung nilai server tanpa menimpa/menghapus ketikan lokal (upsert-only:
    // UI tak pernah mengosongkan fisik, jadi server-kosong = data basi, bukan kebenaran).
    const gabungDetail = useCallback((d) => {
        setBuka(d);
        const kotorKini = kotorRef.current || {};
        const fokus = fokusRef.current;
        setDraf(prev => {
            const next = { ...prev };
            for (const it of d.items || []) {
                if (kotorKini[it.id] || fokus === it.id) continue;
                if (it.fisik != null) next[it.id] = String(it.fisik);
            }
            return next;
        });
    }, []);

    const muatDetail = useCallback(async (id) => {
        const d = await fetchOpnameDetail(id);
        fokusRef.current = '';
        setBuka(d);
        const awal = {};
        for (const it of d.items || []) {
            if (it.fisik != null) awal[it.id] = String(it.fisik);
        }
        // B: pulihkan draf lokal — hanya baris yang di server masih kosong (server menang),
        // hanya bila sesi masih HITUNG, catatan < 7 hari.
        const kotorAwal = {};
        if (d.status === 'HITUNG') {
            try {
                const mentah = localStorage.getItem(`opname-draf-${d.idSesi}`);
                if (mentah) {
                    const simpan = JSON.parse(mentah);
                    const segar = simpan && simpan.t && Date.now() - Number(simpan.t) < 7 * 86400 * 1000;
                    if (segar && simpan.d && typeof simpan.d === 'object') {
                        for (const [rid, v] of Object.entries(simpan.d)) {
                            if (awal[rid] == null && v !== '' && v != null) { awal[rid] = String(v); kotorAwal[rid] = true; }
                        }
                    }
                }
            } catch { /* storage diblokir: abaikan, Simpan manual tetap jalan */ }
        }
        setDraf(awal);
        setKotor(kotorAwal);
        setCari('');
        setKatAktif(null);
    }, []);

    useEffect(() => { muatDaftar(); }, [muatDaftar]);

    // Deep-link dari lonceng sampling: /opname?buka=SOP-... langsung buka sesinya (1x per id).
    const dibukaRef = useRef('');
    useEffect(() => {
        const id = (params.get('buka') || '').trim();
        if (!id || dibukaRef.current === id) return;
        dibukaRef.current = id;
        muatDetail(id).catch(e => setPesan(e.message));
    }, [params, muatDetail]);

    // B: catat ketikan belum-Simpan ke localStorage per sesi (debounce; byte kecil).
    // Berhasil Simpan / sesi tutup = efek ini membersihkan sendiri (kotor kosong -> hapus kunci).
    useEffect(() => {
        if (!buka || buka.status !== 'HITUNG' || !buka.idSesi) return;
        const kunci = `opname-draf-${buka.idSesi}`;
        const t = setTimeout(() => {
            try {
                const isi = {};
                for (const [id, v] of Object.entries(draf)) {
                    if (kotor[id] && v !== '' && v != null) isi[id] = String(v);
                }
                if (Object.keys(isi).length) localStorage.setItem(kunci, JSON.stringify({ d: isi, t: Date.now() }));
                else localStorage.removeItem(kunci);
            } catch { /* abaikan */ }
        }, 500);
        return () => clearTimeout(t);
    }, [draf, kotor, buka]);

    // D: peringatan tutup tab/reload bila ada ketikan belum tersimpan.
    useEffect(() => {
        const jaga = (e) => { if (Object.keys(kotorRef.current || {}).length) e.preventDefault(); };
        window.addEventListener('beforeunload', jaga);
        return () => window.removeEventListener('beforeunload', jaga);
    }, []);

    // Poll realtime 3 orang tiap 8,5 dtk: cek ringkas ringan, detail full hanya bila
    // hitungan berubah. Lewati saat hidden. Baris sedang diketik aman via gabungDetail.
    const sedangPoll = useRef(false);
    useEffect(() => {
        if (!buka || !['HITUNG', 'REVIEW'].includes(buka.status)) return;
        const idSesi = buka.idSesi;
        const tick = async (senyap = true) => {
            if (sedangPoll.current || document.hidden) return;
            sedangPoll.current = true;
            try {
                const ringkas = await fetchOpnameRingkas(idSesi);
                const lokal = bukaRef.current;
                if (!lokal || lokal.idSesi !== idSesi) return;
                const hitungLokal = (lokal.items || []).filter(it => it.fisik != null).length;
                const gerakLokal = (lokal.items || []).filter(it => it.fisik != null && Number(it.fisik) !== Number(it.sistem)).length;
                if (ringkas.status !== lokal.status || ringkas.dihitung !== hitungLokal || ringkas.bergerak !== gerakLokal) {
                    gabungDetail(await fetchOpnameDetail(idSesi));
                    try { setDaftar(await fetchOpname()); } catch { /* daftar latar: abaikan */ }
                }
            } catch { /* senyap: tampilkan data terakhir */ } finally {
                sedangPoll.current = false;
            }
        };
        const t = setInterval(() => { tick(true); }, 8500);
        const saatTerlihat = () => { if (!document.hidden) tick(true); };
        document.addEventListener('visibilitychange', saatTerlihat);
        return () => { clearInterval(t); document.removeEventListener('visibilitychange', saatTerlihat); };
    }, [buka ? buka.idSesi : '', buka ? buka.status : '']);

    async function aksi(fn, okMsg, confirmMsg) {
        if (confirmMsg && !window.confirm(confirmMsg)) return;
        setSibuk(true);
        setPesan('');
        try {
            const res = await fn();
            setPesan(res.pesan || okMsg);
            await muatDaftar();
            return res;
        } catch (e) {
            setPesan(e.message);
            return null;
        } finally {
            setSibuk(false);
        }
    }

    async function mulai() {
        const res = await aksi(() => mulaiOpname(), 'Sesi dibuka.');
        if (res && res.idSesi) {
            try { await muatDetail(res.idSesi); } catch (e) { setPesan(e.message); }
        }
    }

    async function simpanHitungan() {
        if (!buka) return;
        const items = Object.entries(draf)
            .filter(([id, v]) => kotor[id] && v !== '' && v != null)
            .map(([id, fisik]) => ({ id, fisik: Number(fisik) }));
        if (!items.length) { setPesan('Tak ada perubahan baru di HP ini (punya orang lain sudah masuk otomatis).'); return; }
        const res = await aksi(() => hitungOpname(buka.idSesi, items), `${items.length} hitungan tersimpan.`);
        if (res) {
            const terkirim = {};
            for (const it of items) terkirim[it.id] = true;
            setKotor(prev => {
                const next = { ...prev };
                for (const id of Object.keys(terkirim)) delete next[id];
                return next;
            });
            try { gabungDetail(await fetchOpnameDetail(buka.idSesi)); } catch (e) { setPesan(e.message); }
        }
    }

    async function keReview() {
        const res = await aksi(() => reviewOpname(buka.idSesi), 'Masuk review.');
        if (res) { try { await muatDetail(buka.idSesi); } catch (e) { setPesan(e.message); } }
    }

    async function kembali() {
        const res = await aksi(() => kembaliOpname(buka.idSesi), 'Kembali ke hitung.');
        if (res) { try { await muatDetail(buka.idSesi); } catch (e) { setPesan(e.message); } }
    }

    // D: cegah keluar tak sengaja saat ada ketikan belum tersimpan.
    function bolehKeluar() {
        const n = Object.keys(kotor).length;
        if (!n) return true;
        return window.confirm(`Ada ${n} hitungan belum tersimpan di perangkat ini. Tetap keluar?`);
    }

    async function putus() {
        if (!buka) return;
        // Segarkan dulu agar angka confirm = rekap gabungan 3 orang terkini.
        try { gabungDetail(await fetchOpnameDetail(buka.idSesi)); } catch { /* pakai data lokal */ }
        const kini = bukaRef.current;
        const gerak = (kini.items || []).filter(it => it.fisik != null && it.selisih).length;
        const res = await aksi(() => putusOpname(kini.idSesi), 'Selesai.',
            `Putus opname? ${gerak} barang bergerak, stock ikut berubah.`);
        if (res) { try { localStorage.removeItem(`opname-draf-${kini.idSesi}`); } catch {} setBuka(null); setDraf({}); setKotor({}); }
    }

    async function batal() {
        const res = await aksi(() => batalOpname(buka.idSesi), 'Dihapus.',
            'Hapus sesi ini permanen? Hitungan dibuang, stock tak berubah.');
        if (res) { try { localStorage.removeItem(`opname-draf-${buka.idSesi}`); } catch {} setBuka(null); setDraf({}); setKotor({}); }
    }

    const daftarKategori = useMemo(() => opsiKategori(buka ? buka.items : []), [buka]);
    const hitungDihitung = useMemo(() => (buka && buka.items ? buka.items.filter(it => it.fisik != null).length : 0), [buka]);

    const tampilHitung = useMemo(() => {
        if (!buka || buka.status !== 'HITUNG') return [];
        const q = cari.trim().toLowerCase();
        return (buka.items || []).filter(it =>
            (!katAktif || String(it.kategori || '') === katAktif) &&
            (!q || `${it.nama} ${it.merk}`.toLowerCase().includes(q)));
    }, [buka, cari, katAktif]);
    const { currentItems, currentPage, totalPages, nextPage, prevPage } = usePagination(tampilHitung, 20);

    const review = useMemo(() => {
        if (!buka) return { hitung: [], belum: 0, arsip: false, macam: 0, kiniTotal: 0, selisihTotal: 0 };
        const hitung = (buka.items || []).filter(it => it.fisik != null);
        const arsip = buka.status === 'SELESAI';
        // Arsip: selisih vs snapshot awal (fisik-kini selalu 0 pasca-putus).
        const selisihTampil = (it) => arsip ? Number(it.fisik ?? 0) - Number(it.sistem ?? 0) : (it.selisih || 0);
        const kiniTotal = hitung.reduce((a, it) => a + (Number(it.kini ?? it.fisik) || 0), 0);
        const selisihTotal = hitung.reduce((a, it) => a + selisihTampil(it), 0);
        return { hitung, belum: (buka.items || []).length - hitung.length, arsip, macam: hitung.length, kiniTotal, selisihTotal, selisihTampil };
    }, [buka]);

    return (
        <Container className='py-4 hub-lebar'>
            <div className='d-flex justify-content-between align-items-center mb-3'>
                <h2 className='mb-0 fw-bold'>Opname</h2>
                <Button size='sm' variant='outline-secondary' onClick={() => { if (bolehKeluar()) navigate('/inventory'); }}>
                    ← Inventory
                </Button>
            </div>
            {pesan && <Alert variant='info' className='py-2 small'>{pesan}</Alert>}

            {!buka && (
                <Card className='shadow-sm border-0 mb-3' style={{ borderRadius: '12px' }}>
                    <Card.Body>
                        <div className='d-flex justify-content-between align-items-center mb-2'>
                            <strong className='small'>Sesi</strong>
                            <Button size='sm' variant='primary' disabled={sibuk} onClick={mulai}>
                                Mulai opname
                            </Button>
                        </div>
                        {daftar.length === 0 && <p className='small text-muted mb-0'>Belum ada sesi.</p>}
                        {daftar.map(s => (
                            <div key={s.idSesi} className='d-flex justify-content-between align-items-center py-2'
                                style={{ borderBottom: '1px solid #f1f3f5' }}>
                                <div>
                                    <span className='fw-medium small'>{s.idSesi}</span>{' '}
                                    <Badge bg={s.status === 'SELESAI' ? 'success' : 'warning'}>
                                        {s.status}
                                    </Badge>{' '}
                                    {s.total <= 3 && <Badge bg='info'>Mini</Badge>}
                                    <div className='text-muted' style={{ fontSize: '11px' }}>
                                        {s.dihitung}/{s.total} terhitung • {s.bergerak} bergerak
                                    </div>
                                </div>
                                <Button size='sm' variant='outline-primary'
                                    onClick={async () => { try { await muatDetail(s.idSesi); } catch (e) { setPesan(e.message); } }}>
                                    {['HITUNG', 'REVIEW'].includes(s.status) ? 'Lanjut' : 'Arsip'}
                                </Button>
                            </div>
                        ))}
                    </Card.Body>
                </Card>
            )}

            {buka && buka.status === 'HITUNG' && (
                <Card className='shadow-sm border-0 mb-3' style={{ borderRadius: '12px' }}>
                    <Card.Body>
                        <div className='d-flex justify-content-between align-items-center mb-2'>
                            <strong className='small'>{buka.idSesi} — hitung fisik • {hitungDihitung}/{buka.items.length}</strong>
                            <span className='d-flex gap-1'>
                                <Button size='sm' variant='success' disabled={sibuk} onClick={simpanHitungan}>
                                    Simpan{Object.keys(kotor).length > 0 && ` (${Object.keys(kotor).length})`}
                                </Button>
                                <Button size='sm' variant='outline-primary' disabled={sibuk} onClick={keReview}>
                                    Review →
                                </Button>
                                <Button size='sm' variant='outline-danger' disabled={sibuk} onClick={batal}>
                                    Batal
                                </Button>
                            </span>
                        </div>
                        <Form.Control size='sm' value={cari} onChange={e => setCari(e.target.value)}
                            placeholder='Cari barang...' className='mb-2' />
                        <div className='d-flex gap-1 mb-2' style={{ overflowX: 'auto', whiteSpace: 'nowrap' }}>
                            <Button size='sm' variant={katAktif ? 'outline-secondary' : 'secondary'}
                                onClick={() => setKatAktif(null)}>Semua</Button>
                            {daftarKategori.map(k => (
                                <Button key={k} size='sm' variant={katAktif === k ? 'secondary' : 'outline-secondary'}
                                    onClick={() => setKatAktif(katAktif === k ? null : k)}>{k}</Button>
                            ))}
                        </div>
                        {katAktif && <p className='small text-muted mb-2'>Bagianmu: {katAktif} — yang lain di tab berbeda, Simpan masing-masing.</p>}
                        {currentItems.map(it => (
                            <div key={it.id} className='d-flex justify-content-between align-items-center gap-2 py-2'
                                style={{ borderBottom: '1px solid #f1f3f5' }}>
                                <div className='flex-fill' style={{ minWidth: 0 }}>
                                    <div className='fw-medium small text-truncate'>{it.nama}{it.merk ? ` - ${it.merk}` : ''}</div>
                                    <div className='text-muted' style={{ fontSize: '11px' }}>
                                        {it.kategori ? `${it.kategori} • ` : ''}sistem {it.sistem} {it.satuan}
                                        {it.harga != null && (
                                            <> • Rp {rp(it.harga)}/{it.satuan} • Rp {rp((Number(draf[it.id]) || 0) * it.harga)}</>
                                        )}
                                    </div>
                                </div>
                                <Form.Control size='sm' type='number' inputMode='numeric' min='0'
                                    style={{ width: 110, borderColor: kotor[it.id] ? '#ffc107' : undefined }} value={draf[it.id] ?? ''}
                                    onFocus={() => { fokusRef.current = it.id; }}
                                    onBlur={() => { if (fokusRef.current === it.id) fokusRef.current = ''; }}
                                    onChange={e => { const v = e.target.value; setDraf(p => ({ ...p, [it.id]: v })); setKotor(p => ({ ...p, [it.id]: true })); }}
                                    placeholder='Fisik' aria-label={`Fisik ${it.nama}`} />
                            </div>
                        ))}
                        <div className='d-flex justify-content-between align-items-center mt-2'>
                            <span className='small text-muted'>Hal {currentPage}/{totalPages}</span>
                            <span className='d-flex gap-1'>
                                <Button size='sm' variant='outline-secondary' onClick={prevPage}>‹</Button>
                                <Button size='sm' variant='outline-secondary' onClick={nextPage}>›</Button>
                            </span>
                        </div>
                    </Card.Body>
                </Card>
            )}

            {buka && (buka.status === 'REVIEW' || buka.status === 'SELESAI') && (
                <Card className='shadow-sm border-0 mb-3' style={{ borderRadius: '12px' }}>
                    <Card.Body>
                        <div className='d-flex justify-content-between align-items-center mb-2'>
                            <strong className='small'>{buka.idSesi} — {buka.status}</strong>
                            {buka.status === 'REVIEW' && (
                                <span className='d-flex gap-1'>
                                    <Button size='sm' variant='outline-secondary' disabled={sibuk} onClick={kembali}>
                                        ← Hitung
                                    </Button>
                                    <Button size='sm' variant='success' disabled={sibuk} onClick={putus}>
                                        Putus
                                    </Button>
                                    <Button size='sm' variant='outline-danger' disabled={sibuk} onClick={batal}>
                                        Batal
                                    </Button>
                                </span>
                            )}
                            {buka.status !== 'REVIEW' && (
                                <Button size='sm' variant='outline-secondary' onClick={() => { if (bolehKeluar()) setBuka(null); }}>
                                    Daftar sesi
                                </Button>
                            )}
                        </div>
                        <p className='small text-muted'>
                            {review.hitung.length} terhitung
                            {review.belum > 0 && ` • ${review.belum} belum dihitung (tak ikut)`}
                            {review.arsip && review.hitung.length > 0 && (
                                <> • {review.macam} macam • {review.kiniTotal} kini • selisih total {review.selisihTotal > 0 ? `+${review.selisihTotal}` : review.selisihTotal}</>
                            )}
                        </p>
                        <div style={{ maxHeight: '55vh', overflowY: 'auto' }}>
                            <Table striped bordered size='sm' className='mb-0'>
                                <thead>
                                    <tr>
                                        <th>Nama</th>
                                        <th className='text-end'>Sistem</th>
                                        <th className='text-end'>Fisik/Kini</th>
                                        <th className='text-end'>Harga Satuan</th>
                                        <th className='text-end'>Harga Total</th>
                                        <th className='text-end'>Selisih</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {review.hitung.map(it => {
                                        const s = review.selisihTampil ? review.selisihTampil(it) : (it.selisih || 0);
                                        return (
                                        <tr key={it.id} className={s ? 'table-warning' : ''}>
                                            <td>{it.nama}{it.merk ? ` - ${it.merk}` : ''}</td>
                                            <td className='text-end text-muted'>{it.sistem} {it.satuan}</td>
                                            <td className='text-end'>{it.fisik} {it.satuan}
                                                {it.kini != null && Number(it.kini) !== Number(it.fisik) && (
                                                    <div className='text-muted' style={{ fontSize: '11px' }}>kini {it.kini}</div>
                                                )}
                                            </td>
                                            <td className='text-end'>{it.harga != null ? rp(it.harga) : '-'}</td>
                                            <td className='text-end'>{it.harga != null ? rp(it.fisik * it.harga) : '-'}</td>
                                            <td className='text-end fw-bold' style={s ? { color: s > 0 ? '#198754' : '#dc3545' } : {}}>
                                                {s > 0 ? `+${s}` : s}
                                            </td>
                                        </tr>
                                        );
                                    })}
                                    {review.hitung.length === 0 && (
                                        <tr><td colSpan={6} className='text-center text-muted'>Kosong.</td></tr>
                                    )}
                                </tbody>
                            </Table>
                        </div>
                    </Card.Body>
                </Card>
            )}
        </Container>
    );
}
