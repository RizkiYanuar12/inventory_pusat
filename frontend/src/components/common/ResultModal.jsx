import { Modal, Button } from 'react-bootstrap';

export default function ResultModal({ show, sukses, pesan, onClose }) {
    const AWALAN = 'Stok kurang:';
    const daftarKurang = !sukses && typeof pesan === 'string' && pesan.startsWith(AWALAN)
        ? pesan.slice(AWALAN.length).replace(/\.\s*$/, '').split(';').map(s => s.trim()).filter(Boolean)
        : null;
    return (
        <Modal show={show} onHide={onClose} centered>
            <Modal.Header closeButton className={sukses ? 'bg-success text-white' : 'bg-danger text-white'}>
                <Modal.Title>{sukses ? 'Berhasil' : 'Gagal'}</Modal.Title>
            </Modal.Header>
            <Modal.Body className={daftarKurang ? '' : 'text-center'}>
                {daftarKurang ? (
                    <div>
                        <div className='fw-bold mb-1'>Stok Habis:</div>
                        <ul className='mb-0 ps-3'>
                            {daftarKurang.map((it, i) => <li key={i}>{it}</li>)}
                        </ul>
                    </div>
                ) : pesan}
            </Modal.Body>
            <Modal.Footer>
                <Button variant={sukses ? 'success' : 'danger'} onClick={onClose} className="w-100">
                    OK
                </Button>
            </Modal.Footer>
        </Modal>
    );
}
