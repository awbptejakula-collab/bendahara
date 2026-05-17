// ==========================================
// 1. KONFIGURASI UTAMA
// ==========================================
const GAS_URL = "https://script.google.com/macros/s/AKfycbyYVyWUnwtZaY1IeI4EigdtxcvjBYmqHIQlKhZzs0UcIrU5nSU-ikafbvpyUgsY3roh/exec"; 

let currentUserRole = "";
let dataKategori = [];
let dataAnggota = [];
let globalDataTransaksi = []; 
let totalDataTerakhir = 0; 
let base64FotoTemp = ""; 
let intervalNotif; 

const DAFTAR_KELOMPOK = [
    "01 - GEDE SURATHA",
    "02 - MADE CAHYADI",
    "03 - JRO BAU",
    "04 - GEDE AGUS SUASTAWA",
    "05 - GEDE NATIH",
    "06 - JRO PANDITA",
    "07 - GEDE KERTIA"
];

const appMenus = [
    { id: 'menu-kas', title: 'Buku Kas', icon: '📓', target: 'dashboard-screen', type: 'navigasi', active: true, roles: ['Admin', 'Bendahara 1', 'Bendahara 2'] },
    { id: 'menu-iuran', title: 'Daftar Iuran', icon: '👥', target: 'iuran-screen', type: 'navigasi', active: true, roles: ['Admin', 'Bendahara 1', 'Bendahara 2'] },
    { id: 'menu-anggota', title: 'Daftar Anggota', icon: '👤', target: 'anggota-screen', type: 'navigasi', active: true, roles: ['Admin', 'Bendahara 1', 'Bendahara 2'] },
    { id: 'menu-tambah', title: 'Input Transaksi', icon: '➕', target: 'form-screen', type: 'fungsi', action: 'bukaFormTransaksi', active: true, roles: ['Bendahara 1', 'Bendahara 2'] }
];

// ==========================================
// 2. LOGIN & MENU
// ==========================================
async function prosesLogin() {
    const user = document.getElementById('input-username').value.trim();
    const pass = document.getElementById('input-password').value.trim();
    const errorMsg = document.getElementById('login-error');
    if (!user || !pass) return showError("Isi username & password!");

    const btn = document.querySelector('button[onclick="prosesLogin()"]');
    btn.innerText = "Memeriksa..."; btn.disabled = true;

    try {
        const res = await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'login', payload: { username: user, password: pass } }),
            headers: { "Content-Type": "text/plain;charset=utf-8" }
        });
        const result = await res.json();

        if (result.status === 'ok' && result.data.status === 'success') {
            currentUserRole = result.data.role;
            document.getElementById('input-username').value = "";
            document.getElementById('input-password').value = "";
            errorMsg.classList.add('hidden');

            document.getElementById('app-header').classList.remove('hidden');
            document.getElementById('app-footer').classList.remove('hidden');
            document.getElementById('user-role-text').innerText = currentUserRole;
            
            renderMenuDinamis();
            navigasi('main-menu-screen'); 
            loadDataServer(true); 
            tarikDataReferensi(); 
            mulaiPemantauNotifikasi();
        } else {
            showError(result.data.message || "Login gagal!");
        }
    } catch (error) { showError("Gagal terhubung ke server."); } 
    finally { btn.innerText = "Masuk Aplikasi"; btn.disabled = false; }
}

function showError(msg) {
    const el = document.getElementById('login-error');
    el.innerText = msg; el.classList.remove('hidden');
}

function logout() {
    currentUserRole = ""; base64FotoTemp = ""; globalDataTransaksi = []; totalDataTerakhir = 0;
    clearInterval(intervalNotif); 
    document.getElementById('app-header').classList.add('hidden');
    document.getElementById('app-footer').classList.add('hidden');
    document.querySelectorAll('.container > div').forEach(div => div.classList.add('hidden'));
    document.getElementById('login-screen').classList.remove('hidden');
}

function renderMenuDinamis() {
    const gridContainer = document.getElementById('dynamic-menu-grid');
    gridContainer.innerHTML = ""; 
    appMenus.forEach(menu => {
        if (menu.active && menu.roles.includes(currentUserRole)) {
            let actionHtml = menu.type === 'navigasi' ? `navigasi('${menu.target}')` : `${menu.action}()`;
            let cardHtml = `<div class="menu-card" onclick="${actionHtml}"><div class="menu-icon">${menu.icon}</div><div class="menu-title">${menu.title}</div></div>`;
            gridContainer.insertAdjacentHTML('beforeend', cardHtml);
        }
    });
}

function navigasi(idTujuan) {
    document.querySelectorAll('.container > div').forEach(div => div.classList.add('hidden'));
    document.getElementById(idTujuan).classList.remove('hidden');
    if(idTujuan === 'dashboard-screen') renderTabelKas();
    if(idTujuan === 'iuran-screen') renderTabelIuran();
    if(idTujuan === 'anggota-screen') renderTabelAnggota(); 
}

function bukaModal(id) { document.getElementById(id).classList.remove('hidden'); }
function tutupModal(id) { document.getElementById(id).classList.add('hidden'); }

// ==========================================
// 3. DATA SERVER & SINKRONISASI
// ==========================================
function sinkronisasiManual() {
    const ikon = document.querySelector('.icon-btn[title="Refresh Data"]');
    ikon.style.transform = "rotate(360deg)";
    setTimeout(() => ikon.style.transform = "rotate(0deg)", 500);
    document.getElementById('notif-dot').classList.add('hidden'); 
    loadDataServer(false); 
    tarikDataReferensi(); 
}

function cekNotifikasiAlert() {
    if(!document.getElementById('notif-dot').classList.contains('hidden')) {
        alert("Ada data transaksi baru! Sistem akan diperbarui.");
        sinkronisasiManual();
    } else { alert("Sistem sudah mutakhir."); }
}

function mulaiPemantauNotifikasi() {
    intervalNotif = setInterval(async () => {
        if(!currentUserRole) return;
        try {
            const res = await fetch(GAS_URL + "?action=getBukuKas");
            const json = await res.json();
            if (json.status === 'ok' && json.data.length > totalDataTerakhir) {
                document.getElementById('notif-dot').classList.remove('hidden');
            }
        } catch (e) {}
    }, 60000); 
}

async function loadDataServer(isInitialLoad = false) {
    if(!isInitialLoad) {
        document.getElementById('loading-text-kas').classList.remove('hidden');
        document.getElementById('loading-text-iuran').classList.remove('hidden');
    }
    try {
        const res = await fetch(GAS_URL + "?action=getBukuKas");
        const json = await res.json();
        if (json.status === 'ok') {
            globalDataTransaksi = json.data; 
            totalDataTerakhir = json.data.length; 
            renderTabelKas();
            renderTabelIuran();
        }
    } catch (e) {} 
    finally { 
        document.getElementById('loading-text-kas').classList.add('hidden');
        document.getElementById('loading-text-iuran').classList.add('hidden');
    }
}

// ==========================================
// 4. RENDER TABEL & ANGGOTA
// ==========================================
function renderTabelKas() {
    const table = document.getElementById('tabel-kas');
    table.innerHTML = "";
    if (globalDataTransaksi.length === 0) { table.innerHTML = "<tr><td colspan='3' style='text-align:center'>Belum ada transaksi.</td></tr>"; return; }
    
    globalDataTransaksi.forEach(tr => {
        let tgl = new Date(tr.tanggal).toLocaleDateString('id-ID', {day: 'numeric', month:'short'});
        let nominal = new Intl.NumberFormat('id-ID').format(tr.nominal);
        let warnaNominal = tr.jenis === "Pendapatan" ? "var(--primary-dark)" : "var(--danger)";
        
        let ket = `<span style="font-weight:600; font-size:14px;">${tr.kategori}</span><br><span style="font-size:12px; color:#555;">${tr.pihak}</span>`;
        if(tr.keterangan) ket += `<br><span style="color:#888; font-size:11px;"><i>${tr.keterangan}</i></span>`;
        ket += `<br><span class="badge-sumber">Pencatat: ${tr.sumber}</span>`; 
        
        let row = document.createElement('tr');
        row.innerHTML = `<td style="font-size:12px;">${tgl}</td><td>${ket}</td><td style="text-align:right; color:${warnaNominal}; font-weight:bold;">${nominal}</td>`;
        table.appendChild(row);
    });
}

function renderTabelIuran() {
    const table = document.getElementById('tabel-iuran');
    table.innerHTML = "";
    const dataIuran = globalDataTransaksi.filter(tr => tr.kategori === "Iuran Wajib");
    if (dataIuran.length === 0) { table.innerHTML = "<tr><td colspan='3' style='text-align:center'>Belum ada iuran wajib.</td></tr>"; return; }
    
    dataIuran.forEach(tr => {
        let tgl = new Date(tr.tanggal).toLocaleDateString('id-ID', {day: 'numeric', month:'short'});
        let nominal = new Intl.NumberFormat('id-ID').format(tr.nominal);
        let namaTampil = tr.pihak || tr.keluarga || "Anggota";
        let info = `<span style="font-weight:600; font-size:14px;">${namaTampil}</span>`;
        if(tr.keterangan) info += `<br><span style="color:#888; font-size:11px;"><i>${tr.keterangan}</i></span>`;
        info += `<br><span class="badge-sumber">Via: ${tr.sumber}</span>`;
        
        let row = document.createElement('tr');
        row.innerHTML = `<td style="font-size:12px;">${tgl}</td><td>${info}</td><td style="text-align:right; font-weight:bold; color:var(--primary-dark)">${nominal}</td>`;
        table.appendChild(row);
    });
}

function tanyaBayarIuran(idAnggota, nama, kelKeluarga) {
    let totalBayar = 0;
    globalDataTransaksi.forEach(tr => {
        if(tr.kategori === "Iuran Wajib" && tr.id_anggota === idAnggota) {
            totalBayar += parseFloat(tr.nominal);
        }
    });
    
    let msg = `Krama: ${nama}\nTotal Pembayaran Iuran di PWA saat ini: Rp ${new Intl.NumberFormat('id-ID').format(totalBayar)}\n\nLanjutkan ke Pembayaran Iuran Wajib?`;
    
    if (confirm(msg)) {
        bukaFormTransaksi();
        document.getElementById('form-jenis').value = "Pendapatan";
        gantiJenis(); 
        document.getElementById('form-kategori').value = "Iuran Wajib";
        gantiKategori(); 
        
        document.getElementById('form-kelompok-keluarga').value = kelKeluarga;
        filterAnggotaForm();
        
        // Timeout pendek agar filterAnggotaForm() selesai memuat option sebelum .value di set
        setTimeout(() => {
            document.getElementById('form-anggota').value = idAnggota;
            autofillAnggota();
        }, 100);
    }
}

function renderTabelAnggota() {
    const table = document.getElementById('tabel-anggota');
    const filter = document.getElementById('filter-kelompok-keluarga').value;
    table.innerHTML = "";

    let filteredData = dataAnggota;
    if (filter !== "Semua") {
        filteredData = dataAnggota.filter(a => `${a.kelompok} - ${a.keluarga}` === filter);
    }

    if (filteredData.length === 0) {
        table.innerHTML = "<tr><td colspan='5' style='text-align:center'>Belum ada data anggota.</td></tr>"; return;
    }

    filteredData.forEach(a => {
        let nom = new Intl.NumberFormat('id-ID').format(a.iuran || 0);
        let kelKel = `${a.kelompok} - ${a.keluarga}`;
        let row = document.createElement('tr');
        row.innerHTML = `
            <td><span class="krama-link" onclick="tanyaBayarIuran('${a.id_anggota}', '${a.nama_anggota}', '${kelKel}')">${a.nama_anggota}</span></td>
            <td>${a.keberadaan}</td>
            <td>${a.status_kk}</td>
            <td style="text-align:right;">${nom}</td>
            <td style="color:var(--primary-dark); font-weight:bold;">AKTIF</td>
        `;
        table.appendChild(row);
    });
}

async function tarikDataReferensi() {
    try {
        let resKat = await fetch(GAS_URL + "?action=getKategori");
        let jsonKat = await resKat.json();
        if(jsonKat.status === 'ok') dataKategori = jsonKat.data;

        let resAng = await fetch(GAS_URL + "?action=getAnggotaDropdown");
        let jsonAng = await resAng.json();
        if(jsonAng.status === 'ok') {
            dataAnggota = jsonAng.data;
            
            let selFilter = document.getElementById('filter-kelompok-keluarga');
            selFilter.innerHTML = '<option value="Semua">Tampilkan Semua</option>';
            
            let selForm = document.getElementById('form-kelompok-keluarga');
            selForm.innerHTML = '<option value="">-- Pilih Kelompok & Keluarga --</option>';
            
            DAFTAR_KELOMPOK.forEach(item => {
                selFilter.innerHTML += `<option value="${item}">${item}</option>`;
                selForm.innerHTML += `<option value="${item}">${item}</option>`;
            });

            renderTabelAnggota();
        }
    } catch (error) {}
}

// ==========================================
// 5. FORM TRANSAKSI DINAMIS 
// ==========================================
function bukaFormTransaksi() {
    navigasi('form-screen');
    document.getElementById('form-tanggal').valueAsDate = new Date();
    document.getElementById('form-nominal').value = "";
    document.getElementById('form-keterangan').value = "";
    document.getElementById('form-nama-pihak').value = "";
    document.getElementById('form-jumlah-periode').value = "1"; 
    document.getElementById('form-jenis-kk').value = ""; 
    document.getElementById('form-foto').value = "";
    document.getElementById('preview-foto').classList.add('hidden');
    base64FotoTemp = "";

    document.getElementById('form-jenis').value = "Pendapatan";
    gantiJenis();
}

function gantiJenis() {
    const jenis = document.getElementById('form-jenis').value;
    const labelPihak = document.getElementById('label-nama-pihak');
    const inputPihak = document.getElementById('form-nama-pihak');
    const dropdownKat = document.getElementById('form-kategori');

    if (jenis === "Pendapatan") {
        labelPihak.innerText = "Nama Pembayar / Penyetor:";
        inputPihak.placeholder = "Contoh: Bpk. Wayan";
    } else {
        labelPihak.innerText = "Nama Penerima Dana:";
        inputPihak.placeholder = "Contoh: Toko Bangunan";
    }

    dropdownKat.innerHTML = "";
    let filterKat = dataKategori.filter(k => k.jenis === jenis);
    if (filterKat.length === 0) {
        if (jenis === "Pendapatan") filterKat = [{nama: "Iuran Wajib"}, {nama: "Sukarela/Punia"}];
        else filterKat = [{nama: "Operasional Ngaben"}, {nama: "Santunan Ngaben"}];
    }
    filterKat.forEach(k => { dropdownKat.innerHTML += `<option value="${k.nama}">${k.nama}</option>`; });

    gantiKategori();
}

function gantiKategori() {
    const kategori = document.getElementById('form-kategori').value;
    const grupIuran = document.getElementById('grup-iuran');
    
    if (kategori === "Iuran Wajib") {
        grupIuran.classList.remove('hidden');
    } else {
        grupIuran.classList.add('hidden');
        document.getElementById('form-jenis-kk').value = "";
        document.getElementById('form-jumlah-periode').value = "1";
        document.getElementById('form-nominal').value = "";
        document.getElementById('form-anggota').value = "";
        document.getElementById('hint-nominal').classList.add('hidden'); 
    }
}

function filterAnggotaForm() {
    const kelKeluarga = document.getElementById('form-kelompok-keluarga').value;
    const selAnggota = document.getElementById('form-anggota');
    
    selAnggota.innerHTML = '<option value="">-- Pilih Krama --</option>';
    document.getElementById('form-jenis-kk').value = "";
    document.getElementById('form-nominal').value = "";
    
    if(!kelKeluarga) return;

    let filtered = dataAnggota.filter(a => `${a.kelompok} - ${a.keluarga}` === kelKeluarga);
    filtered.forEach(a => {
        selAnggota.innerHTML += `<option value="${a.id_anggota}">${a.nama_anggota}</option>`;
    });
}

function autofillAnggota() {
    const idDipilih = document.getElementById('form-anggota').value;
    if(!idDipilih) return;

    const anggota = dataAnggota.find(a => a.id_anggota === idDipilih);
    if(anggota) {
        document.getElementById('form-nama-pihak').value = anggota.nama_anggota;
        document.getElementById('form-jenis-kk').value = anggota.status_kk;
        document.getElementById('form-jumlah-periode').value = "1";
        kalkulasiNominalKK();
    }
}

function kalkulasiNominalKK() {
    const idDipilih = document.getElementById('form-anggota').value;
    const jumlahPeriode = parseInt(document.getElementById('form-jumlah-periode').value) || 1;
    const formNominal = document.getElementById('form-nominal');
    const hintNominal = document.getElementById('hint-nominal');
    const jenisKK = document.getElementById('form-jenis-kk').value;
    
    // Hilangkan semua spasi agar matching PWA kebal dari error ketik di sheet (contoh: "KK 01" jadi "KK01")
    let keyKK = jenisKK ? jenisKK.toString().toUpperCase().replace(/\s+/g, '') : "";
    
    const tarifKK = { 
        "KK1": 50000, "KK01": 50000, "KK2": 100000, "KK02": 100000, 
        "DUDA1": 50000, "DUDA01": 50000, "DUDA2": 100000, "DUDA02": 100000, 
        "JANDA": 25000, "BUJANG": 25000 
    };

    if (tarifKK[keyKK]) {
        formNominal.value = tarifKK[keyKK] * jumlahPeriode;
        if (jumlahPeriode > 1) {
            hintNominal.innerText = `* Tarif Rp ${tarifKK[keyKK].toLocaleString('id-ID')} x ${jumlahPeriode} periode. Bisa diedit manual.`;
        } else {
            hintNominal.innerText = "* Bisa diedit manual jika pembayaran kolektif.";
        }
        hintNominal.classList.remove('hidden'); 
    } else {
        // Jika tidak masuk daftar (aneh), fallback menggunakan data Iuran dari Sheet
        if(idDipilih) {
            const anggota = dataAnggota.find(a => a.id_anggota === idDipilih);
            if(anggota && anggota.iuran) {
                formNominal.value = anggota.iuran * jumlahPeriode;
                hintNominal.innerText = `* Diambil dari database: Rp ${anggota.iuran.toLocaleString('id-ID')} x ${jumlahPeriode}. Bisa diedit.`;
                hintNominal.classList.remove('hidden');
                return;
            }
        }
        formNominal.value = "";
        hintNominal.classList.add('hidden');
    }
}

// ==========================================
// 6. FOTO & SIMPAN
// ==========================================
function previewFoto(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            let width = img.width, height = img.height;
            const MAX_SIZE = 800;
            if (width > height && width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; } 
            else if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
            canvas.width = width; canvas.height = height;
            canvas.getContext('2d').drawImage(img, 0, 0, width, height);
            base64FotoTemp = canvas.toDataURL('image/jpeg', 0.6); 
            const preview = document.getElementById('preview-foto');
            preview.src = base64FotoTemp; preview.classList.remove('hidden');
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

async function simpanDataTransaksi() {
    const kategoriForm = document.getElementById('form-kategori').value;
    const periodeForm = parseInt(document.getElementById('form-jumlah-periode').value) || 1;
    let keteranganForm = document.getElementById('form-keterangan').value.trim();

    if (kategoriForm === "Iuran Wajib" && periodeForm > 1) { keteranganForm = `[Bayar ${periodeForm} Periode] ` + keteranganForm; }

    const payload = {
        role: currentUserRole, tanggal: document.getElementById('form-tanggal').value,
        jenis: document.getElementById('form-jenis').value, kategori: kategoriForm,
        nama_pihak: document.getElementById('form-nama-pihak').value.trim(),
        id_anggota: document.getElementById('form-anggota').value,
        kelompok: document.getElementById('form-kelompok-keluarga').value, 
        jenis_kk: document.getElementById('form-jenis-kk').value,
        jenis_pembayaran: document.getElementById('form-pembayaran').value,
        nominal: document.getElementById('form-nominal').value,
        keterangan: keteranganForm, foto_base64: base64FotoTemp 
    };

    if (!payload.tanggal || !payload.nominal || !payload.nama_pihak) { alert("Tanggal, Nama, dan Nominal wajib diisi!"); return; }
    
    const btnSimpan = document.getElementById('btn-simpan');
    btnSimpan.innerText = "⏳ Sedang Mengirim Data..."; btnSimpan.disabled = true;

    try {
        const res = await fetch(GAS_URL, {
            method: 'POST', body: JSON.stringify({ action: 'simpanTransaksi', payload: payload }),
            headers: { "Content-Type": "text/plain;charset=utf-8" }
        });
        const result = await res.json();
        if (result.status === 'ok' && result.data.status === 'success') {
            alert("✅ Transaksi & Foto berhasil disimpan!");
            sinkronisasiManual(); navigasi('main-menu-screen'); 
        } else { alert("Gagal menyimpan: " + result.data.message); }
    } catch (error) { alert("Error jaringan. Transaksi gagal dikirim."); } 
    finally { btnSimpan.innerText = "💾 Simpan Transaksi"; btnSimpan.disabled = false; }
}
