/* eslint-disable react-refresh/only-export-components -- provider + hook dalam 1 file */
import { createContext, useContext, useState } from 'react';

// State tampilan hub /pesanan (tab, filter, draf) agar tetap hidup saat pindah ke halaman surat jalan.
const KUNCI = ['tab', 'fCari', 'fTab', 'lacakId', 'lStatus', 'lOutlet', 'lCari', 'batas', 'draf'];
const AWAL = {
    tab: 'daftar',
    fCari: '',
    fTab: 'baru',
    lacakId: '',
    lStatus: 'Semua',
    lOutlet: 'Semua',
    lCari: '',
    batas: 20,
    draf: {},
};

const HubPesananContext = createContext(null);

export function HubPesananProvider({ children }) {
    const [state, setState] = useState(AWAL);
    const value = {};
    for (const k of KUNCI) value[k] = state[k];
    for (const k of KUNCI) value[`set${k[0].toUpperCase()}${k.slice(1)}`] = (updater) => {
        setState(s => ({ ...s, [k]: typeof updater === 'function' ? updater(s[k]) : updater }));
    };
    return <HubPesananContext.Provider value={value}>{children}</HubPesananContext.Provider>;
}

export function useHub() {
    const v = useContext(HubPesananContext);
    if (!v) throw new Error('useHub harus dipakai di dalam HubPesananProvider');
    return v;
}