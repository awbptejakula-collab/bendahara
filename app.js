// ==========================================
// 1. KONFIGURASI UTAMA & VARIABEL GLOBAL
// ==========================================
// PASTE URL WEB APP ANDA DI SINI:
const GAS_URL = "https://script.google.com/macros/s/AKfycbyYVyWUnwtZaY1IeI4EigdtxcvjBYmqHIQlKhZzs0UcIrU5nSU-ikafbvpyUgsY3roh/exec"; 

let currentUserRole = "";
let dataKategori = [];
let dataAnggota = [];
let globalDataTransaksi = []; 
let totalDataTerakhir = 0; // Untuk trigger notifikasi
let base64FotoTemp = ""; 
let intervalNotif; // Menyimpan timer notifikasi latar belakang

// ==========================================
// 2. KONFIGURASI MENU DINAMIS (Bisa Diupdate Disini)
// ==========================================
/* Aturan Konfigurasi:
  - active: true (Menu tampil), false (Menu disembunyikan/non-aktif)
  - roles: Siapa saja yang bisa melihat kotak menu ini
*/
const appMenus = [
    { id: 'menu-kas', title: 'Buku Kas', icon: '📓', target: 'dashboard-screen', type: 'navigasi', active: true, roles: ['Admin', 'Bendahara 1', 'Bendahara 2'] },
    { id: 'menu-iuran', title: 'Daftar Iuran', icon: '👥', target: 'iuran-screen', type: 'navigasi', active: true, roles: ['Admin', 'Bendahara 1', 'Bendahara 2'] },
    { id: 'menu-tambah', title: 'Input Transaksi', icon: '➕', target: 'form-screen', type: 'fungsi', action: 'bukaFormTransaksi', active: true, roles: ['Bendahara 1', 'Bendahara 2'] },
    // Contoh jika ingin menambah menu masa depan (di-set false untuk sementara):
    { id: 'menu-laporan', title: 'Laporan Bulanan', icon: '📊', target: '#', type: 'navigasi', active: false, roles: ['Admin'] }
];

// ==========================================
// 3. FUNGSI LOGIN & RENDER MENU
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
            
            // Bersihkan form
            document.getElementById('input-username').value = "";
            document.getElementById('input-password').value = "";
            errorMsg.classList.add('hidden');

            // Munculkan UI Utama (Header, Footer, Menu)
            document.getElementById('app-header').classList.remove('hidden');
            document.getElementById('app-footer').classList.remove('hidden');
            document.getElementById('user-role-text').innerText = currentUserRole;
            
            renderMenuDinamis();
            navigasi('main-menu-screen'); 
            
            // Tarik data awal & aktifkan pemantau notifikasi
            loadDataServer(true); // true = inisialisasi awal
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
    clearInterval(intervalNotif); // Hentikan pemantau latar belakang
    
    // Sembunyikan elemen dashboard
    document.getElementById('app-header').classList.add('hidden');
    document.getElementById('app-footer').classList.add('hidden');
    document.querySelectorAll('.container > div').forEach(div => div.classList.add('hidden'));
    
    // Kembali ke login
    document.getElementById('login-screen').classList.remove('hidden');
}

// Me-render Card Menu secara otomatis berdasarkan Role dan Konfigurasi
function renderMenuDinamis() {
    const gridContainer = document.getElementById('dynamic-menu-grid');
    gridContainer.innerHTML = ""; // Bersihkan isi lama

    appMenus.forEach(menu => {
        // Cek apakah menu aktif dan role sesuai
        if (menu.active && menu.roles.includes(currentUserRole)) {
            let actionHtml = menu.type === 'navigasi' ? `navigasi('${menu.target}')` : `${menu.action}()`;
            
            let cardHtml = `
                <div class="menu-card" onclick="${actionHtml}">
                    <div class="menu-icon">${menu.icon}</div>
                    <div class="menu-title">${menu.title}</div>
                </div>
            `;
            gridContainer.insertAdjacentHTML('beforeend', cardHtml);
        }
    });
}

function navigasi(idTujuan) {
    // Sembunyikan semua layar di dalam container
    document.querySelectorAll('.container > div').forEach(div => div.classList.add('hidden'));
    // Munculkan layar tujuan
    document.getElementById(idTujuan).classList.remove('hidden');
    
    // Render ulang tabel (membaca dari RAM, bukan server) agar instan
    if(idTujuan === 'dashboard-screen') renderTabelKas();
    if(idTujuan === 'iuran-screen') renderTabelIuran();
}

// ==========================================
// 4. SISTEM NOTIFIKASI & SINKRONISASI 
// ==========================================
// Dijalankan saat tombol 🔄 di header ditekan
function sinkronisasiManual() {
    // Putar ikon sebagai efek visual
    const ikon = document.querySelector('.icon-btn[title="Refresh Data"]');
    ikon.style.transform = "rotate(360deg)";
    setTimeout(() => ikon.style.transform = "rotate(0deg)", 500);
    
    document.getElementById('notif-dot').classList.add('hidden'); // Sembunyikan dot merah
    loadDataServer(false); // Tarik ulang dari server
}

// Jika tombol lonceng 🔔 ditekan
function cekNotifikasiAlert() {
    if(!document.getElementById('notif-dot').classList.contains('hidden')) {
        alert("Ada data transaksi baru dari rekan Anda! Sistem akan diperbarui.");
        sinkronisasiManual();
    } else {
        alert("Sistem Anda sudah yang paling mutakhir. Tidak ada transaksi baru tertinggal.");
    }
}

// Memeriksa database setiap 1 menit (60000 ms) di latar belakang
function mulaiPemantauNotifikasi() {
    intervalNotif = setInterval(async () => {
        if(!currentUserRole) return;
        try {
            const res = await fetch(GAS_URL + "?action=getBukuKas");
            const json = await res.json();
            if (json.status === 'ok' && json.data.length > totalDataTerakhir) {
                // Jika data di server lebih banyak, nyalakan titik merah!
                document.getElementById('notif-dot').classList.remove('hidden');
            }
        } catch (e) {}
    }, 60000); 
}

// ==========================================
// 5. FUNGSI TARIK & RENDER DATA
// ==========================================
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
            totalDataTerakhir = json.data.length; // Kunci angka untuk pemantau notif
            renderTabelKas();
            renderTabelIuran();
        }
    } catch (e) {} 
    finally { 
        document.getElementById('loading-text-kas').classList.add('hidden');
        document.getElementById('loading-text-iuran').classList.add('hidden');
    }
}

function renderTabelKas() {
    const table = document.getElementById('tabel-kas');
    table.innerHTML = "";
    if (globalDataTransaksi.length === 0) {
        table.innerHTML = "<tr><td colspan='3' style='text-align:center'>Belum ada transaksi.</td></tr>"; return;
    }
    
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
    
    if (dataIuran.length === 0) {
        table.innerHTML = "<tr><td colspan='3' style='text-align:center'>Belum ada iuran wajib.</td></tr>"; return;
    }
    
    dataIuran.forEach(tr => {
        let tgl = new Date(tr.tanggal).toLocaleDateString('id-ID', {day: 'numeric', month:'short'});
        let nominal = new Intl.NumberFormat('id-ID').format(tr.nominal);
        
        let namaTampil = tr.pihak || tr.kelompok || "Anggota";
        let info = `<span style="font-weight:600; font-size:14px;">${namaTampil}</span>`;
        if(tr.keterangan) info += `<br><span style="color:#888; font-size:11px;"><i>${tr.keterangan}</i></span>`;
        info += `<br><span class="badge-sumber">Via: ${tr.sumber}</span>`;
        
        let row = document.createElement('tr');
        row.innerHTML = `<td style="font-size:12px;">${tgl}</td><td>${info}</td><td style="text-align:right; font-weight:bold; color:var(--primary-dark)">${nominal}</td>`;
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
            let selAng = document.getElementById('form-anggota');
            selAng.innerHTML = '<option value="">-- Pilih Anggota --</option>';
            dataAnggota.forEach(a => { selAng.innerHTML += `<option value="${a.id_anggota}">${a.nama_anggota}</option>`; });
        }
    } catch (error) {}
}

// ==========================================
// 6. FUNGSI FORM TRANSAKSI DINAMIS 
// ==========================================
function bukaFormTransaksi() {
    navigasi('form-screen');
    
    document.getElementById('form-tanggal').valueAsDate = new Date();
    document.getElementById('form-nominal').value = "";
    document.getElementById('form-keterangan').value = "";
    document.getElementById('form-nama-pihak').value = "";
    document.getElementById('form-jumlah-periode').value = "1"; 
    
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
        inputPihak.placeholder = "Contoh: Toko Bangunan / Tukang";
    }

    dropdownKat.innerHTML = "";
    let filterKat = dataKategori.filter(k => k.jenis === jenis);
    
    if (filterKat.length === 0) {
        if (jenis === "Pendapatan") filterKat = [{nama: "Iuran Wajib"}, {nama: "Sukarela/Punia"}];
        else filterKat = [{nama: "Operasional Ngaben"}, {nama: "Santunan Ngaben"}, {nama: "Pemeliharaan Alat"}];
    }

    filterKat.forEach(k => {
        let opt = document.createElement('option');
        opt.value = k.nama; opt.innerText = k.nama;
        dropdownKat.appendChild(opt);
    });

    gantiKategori();
}

function gantiKategori() {
    const kategori = document.getElementById('form-kategori').value;
    const grupIuran = document.getElementById('grup-iuran');
    const formNominal = document.getElementById('form-nominal');
    const formJenisKK = document.getElementById('form-jenis-kk');
    const formPeriode = document.getElementById('form-jumlah-periode');
    const hintNominal = document.getElementById('hint-nominal');

    if (kategori === "Iuran Wajib") {
        grupIuran.classList.remove('hidden');
        kalkulasiNominalKK(); 
    } else {
        grupIuran.classList.add('hidden');
        formJenisKK.value = "";
        formPeriode.value = "1";
        formNominal.value = "";
        hintNominal.classList.add('hidden'); 
    }
}

function kalkulasiNominalKK() {
    const jenisKK = document.getElementById('form-jenis-kk').value;
    const jumlahPeriode = parseInt(document.getElementById('form-jumlah-periode').value) || 1;
    const formNominal = document.getElementById('form-nominal');
    const hintNominal = document.getElementById('hint-nominal');
    
    const tarifKK = {
        "KK 01": 50000, "KK 02": 100000, "Duda 01": 50000, 
        "Duda 02": 100000, "Janda": 25000, "Bujang": 25000
    };

    if (tarifKK[jenisKK]) {
        formNominal.value = tarifKK[jenisKK] * jumlahPeriode;
        if (jumlahPeriode > 1) {
            hintNominal.innerText = `* Tarif Rp ${tarifKK[jenisKK].toLocaleString('id-ID')} dikali ${jumlahPeriode} periode. Bisa diedit manual.`;
        } else {
            hintNominal.innerText = "* Bisa diedit manual jika pembayaran kolektif.";
        }
        hintNominal.classList.remove('hidden'); 
    } else {
        formNominal.value = "";
        hintNominal.classList.add('hidden');
    }
}

// ==========================================
// 7. FUNGSI KOMPRESI FOTO & SIMPAN
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
            preview.src = base64FotoTemp;
            preview.classList.remove('hidden');
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

async function simpanDataTransaksi() {
    const kategoriForm = document.getElementById('form-kategori').value;
    const periodeForm = parseInt(document.getElementById('form-jumlah-periode').value) || 1;
    let keteranganForm = document.getElementById('form-keterangan').value.trim();

    if (kategoriForm === "Iuran Wajib" && periodeForm > 1) {
        keteranganForm = `[Bayar ${periodeForm} Periode] ` + keteranganForm;
    }

    const payload = {
        role: currentUserRole,
        tanggal: document.getElementById('form-tanggal').value,
        jenis: document.getElementById('form-jenis').value,
        kategori: kategoriForm,
        nama_pihak: document.getElementById('form-nama-pihak').value.trim(),
        id_anggota: document.getElementById('form-anggota').value,
        kelompok: document.getElementById('form-kelompok').value,
        jenis_kk: document.getElementById('form-jenis-kk').value,
        jenis_pembayaran: document.getElementById('form-pembayaran').value,
        nominal: document.getElementById('form-nominal').value,
        keterangan: keteranganForm, 
        foto_base64: base64FotoTemp 
    };

    if (!payload.tanggal || !payload.nominal || !payload.nama_pihak) {
        alert("Tanggal, Nama Pembayar/Penerima, dan Nominal wajib diisi!"); return;
    }
    if (payload.kategori === "Iuran Wajib" && !payload.jenis_kk) {
        alert("Pilih Jenis KK untuk Iuran Wajib!"); return;
    }

    const btnSimpan = document.getElementById('btn-simpan');
    btnSimpan.innerText = "⏳ Sedang Mengirim Data..."; btnSimpan.disabled = true;

    try {
        const res = await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'simpanTransaksi', payload: payload }),
            headers: { "Content-Type": "text/plain;charset=utf-8" }
        });
        const result = await res.json();

        if (result.status === 'ok' && result.data.status === 'success') {
            alert("✅ Transaksi & Foto berhasil disimpan!");
            sinkronisasiManual(); // Tarik data terbaru setelah simpan
            navigasi('main-menu-screen'); 
        } else {
            alert("Gagal menyimpan: " + result.data.message);
        }
    } catch (error) { alert("Error jaringan. Transaksi gagal dikirim."); } 
    finally { btnSimpan.innerText = "💾 Simpan Transaksi"; btnSimpan.disabled = false; }
}
