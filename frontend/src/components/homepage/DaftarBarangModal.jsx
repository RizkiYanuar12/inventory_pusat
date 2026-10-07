import { Modal, Button, Table } from 'react-bootstrap';

// Modal daftar generik: dipakai kartu Total Aset (belum ada harga), Stock Habis,
// Stock Menipis. items = [{id, nama, varian, info}] — info dirakit pemanggil.
export default function DaftarBarangModal({ show, judul, items, onLihat, onTutup }) {
    return (
        <Modal show={show} onHide={onTutup} centered>
            <Modal.Header closeButton>
                <Modal.Title className='fs-6'>{judul}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <div style={{ maxHeight: '50vh', overflowY: 'auto' }}>
                    <Table striped bordered hover size='sm' className='mb-0'>
                        <thead>
                            <tr>
                                <th>Nama</th>
                                <th className='text-end'>Stock</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {(items || []).map(it => (
                                <tr key={it.id}>
                                    <td>{it.nama}{it.varian ? ` - ${it.varian}` : ''}
                                        <div className='text-muted' style={{ fontSize: '11px' }}>{it.id}</div>
                                    </td>
                                    <td className='text-end'>{it.info}</td>
                                    <td className='text-end'>
                                        <Button size='sm' variant='outline-primary' onClick={() => onLihat(it.id)}>
                                            Lihat
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                            {(items || []).length === 0 && (
                                <tr><td colSpan={3} className='text-center text-muted'>Kosong.</td></tr>
                            )}
                        </tbody>
                    </Table>
                </div>
            </Modal.Body>
        </Modal>
    );
}
