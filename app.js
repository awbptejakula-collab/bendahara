// ==========================================
// KONFIGURASI 
// ==========================================
// PASTE URL WEB APP BARU ANDA DI BAWAH INI:
const GAS_URL = "https://script.google.com/macros/s/AKfycbyYVyWUnwtZaY1IeI4EigdtxcvjBYmqHIQlKhZzs0UcIrU5nSU-ikafbvpyUgsY3roh/exec"; 

let currentUserRole = "";
let dataKategori = [];
let dataAnggota = [];
let base64FotoTemp = ""; 

// ==========================================
// FUNGSI LOGIN & DASHBOARD
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

            document.getElementById('login-screen').classList.add('hidden');
            document.getElementById('dashboard-screen').classList.remove('hidden');
            document.getElementById('welcome-text').innerText = "Buku Kas - " + currentUserRole;
            
            document.getElementById('btn-tambah').classList.toggle('hidden', currentUserRole === "Admin");

            loadBukuKas();
            tarikDataReferensi(); 
        } else {
            showError(result.data.message || "Login gagal!");
        }
    } catch (error) { showError("Gagal terhubung ke server."); } 
    finally { btn.innerText = "Masuk"; btn.disabled = false; }
}

function showError(msg) {
    const el = document.getElementById('login-error');
    el.innerText = msg; el.classList.remove('hidden');
}

function logout() {
    currentUserRole = ""; base64FotoTemp = "";
    document.getElementById('dashboard-screen').classList.add('hidden');
    document.getElementById('form-screen').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
}

async function loadBukuKas() {
    const table = document.getElementById('tabel-kas');
    document.getElementById('loading-text').classList.remove('hidden');
    table.innerHTML = "";
    try {
        const res = await fetch(GAS_URL + "?action=getBukuKas");
        const json = await res.json();
        if (json.status === 'ok') {
            if(json.data.length === 0) {
                table.innerHTML = "<tr><td colspan='4'>Belum ada transaksi.</td></tr>";
                return;
            }
            json.data.forEach(tr => {
                let tgl = new Date(tr.tanggal).toLocaleDateString('id-ID');
                let nominal = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(tr.nominal);
                let ket = `<b>${tr.kategori}</b><br><small>${tr.pihak}</small>`;
                
                let row = document.createElement('tr');
                row.innerHTML = `<td>${tgl}</td><td>${ket}</td><td>${tr.jenis}</td><td style="text-align:right;">${nominal}</td>`;
                table.appendChild(row);
            });
        }
    } catch (e) { console.error(e); } 
    finally { document.getElementById('loading-text').classList.add('hidden'); }
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
            // Isi dropdown anggota
            let selAng = document.getElementById('form-anggota');
            selAng.innerHTML = '<option value="">-- Pilih Anggota --</option>';
            dataAnggota.forEach(a => { selAng.innerHTML += `<option value="${a.id_anggota}">${a.nama_anggota}</option>`; });
        }
    } catch (error) {}
}

// ==========================================
// FUNGSI FORM TRANSAKSI DINAMIS & LOGIKA IURAN
// ==========================================
function bukaFormTransaksi() {
    document.getElementById('dashboard-screen').classList.add('hidden');
    document.getElementById('form-screen').classList.remove('hidden');
    
    document.getElementById('form-tanggal').valueAsDate = new Date();
    document.getElementById('form-nominal').value = "";
    document.getElementById('form-keterangan').value = "";
    document.getElementById('form-nama-pihak').value = "";
    
    document.getElementById('form-foto').value = "";
    document.getElementById('preview-foto').classList.add('hidden');
    base64FotoTemp = "";

    // Reset dropdown jenis ke Pendapatan dan jalankan filter
    document.getElementById('form-jenis').value = "Pendapatan";
    gantiJenis();
}

function tutupFormTransaksi() {
    document.getElementById('form-screen').classList.add('hidden');
    document.getElementById('dashboard-screen').classList.remove('hidden');
}

function gantiJenis() {
    const jenis = document.getElementById('form-jenis').value;
    const labelPihak = document.getElementById('label-nama-pihak');
    const inputPihak = document.getElementById('form-nama-pihak');
    const dropdownKat = document.getElementById('form-kategori');

    // 1. Ubah Label (Nama Pembayar vs Nama Penerima)
    if (jenis === "Pendapatan") {
        labelPihak.innerText = "Nama Pembayar / Penyetor:";
        inputPihak.placeholder = "Contoh: Bpk. Wayan";
    } else {
        labelPihak.innerText = "Nama Penerima Dana:";
        inputPihak.placeholder = "Contoh: Toko Bangunan / Tukang";
    }

    // 2. Filter Dropdown Kategori dengan fitur "Fallback" (jika koneksi lambat)
    dropdownKat.innerHTML = "";
    let filterKat = dataKategori.filter(k => k.jenis === jenis);
    
    if (filterKat.length === 0) {
        // Fallback Data Standar
        if (jenis === "Pendapatan") filterKat = [{nama: "Iuran Wajib"}, {nama: "Sukarela/Punia"}];
        else filterKat = [{nama: "Operasional Ngaben"}, {nama: "Santunan Ngaben"}, {nama: "Pemeliharaan Alat"}];
    }

    filterKat.forEach(k => {
        let opt = document.createElement('option');
        opt.value = k.nama; opt.innerText = k.nama;
        dropdownKat.appendChild(opt);
    });

    // 3. Panggil gantiKategori untuk mengecek apakah Iuran Wajib terpilih
    gantiKategori();
}

function gantiKategori() {
    const kategori = document.getElementById('form-kategori').value;
    const grupIuran = document.getElementById('grup-iuran');
    const formNominal = document.getElementById('form-nominal');
    const formJenisKK = document.getElementById('form-jenis-kk');

    if (kategori === "Iuran Wajib") {
        grupIuran.classList.remove('hidden');
        kalkulasiNominalKK(); // Kunci otomatis jika sudah ada pilihan
    } else {
        grupIuran.classList.add('hidden');
        formJenisKK.value = "";
        formNominal.value = "";
        formNominal.readOnly = false;
        formNominal.style.backgroundColor = "#ffffff";
    }
}

function kalkulasiNominalKK() {
    const jenisKK = document.getElementById('form-jenis-kk').value;
    const formNominal = document.getElementById('form-nominal');
    
    const tarifKK = {
        "KK 01": 50000, "KK 02": 100000, 
        "Duda 01": 50000, "Duda 02": 100000, 
        "Janda": 25000, "Bujang": 25000
    };

    if (tarifKK[jenisKK]) {
        formNominal.value = tarifKK[jenisKK];
        formNominal.readOnly = true;
        formNominal.style.backgroundColor = "#eef2f3"; // Warna abu-abu (terkunci)
    } else {
        formNominal.value = "";
        formNominal.readOnly = false;
        formNominal.style.backgroundColor = "#ffffff";
    }
}

// ==========================================
// FUNGSI KOMPRESI FOTO
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

// ==========================================
// FUNGSI SIMPAN KE SERVER
// ==========================================
async function simpanDataTransaksi() {
    const payload = {
        role: currentUserRole,
        tanggal: document.getElementById('form-tanggal').value,
        jenis: document.getElementById('form-jenis').value,
        kategori: document.getElementById('form-kategori').value,
        nama_pihak: document.getElementById('form-nama-pihak').value.trim(),
        id_anggota: document.getElementById('form-anggota').value,
        kelompok: document.getElementById('form-kelompok').value,
        jenis_kk: document.getElementById('form-jenis-kk').value,
        jenis_pembayaran: document.getElementById('form-pembayaran').value,
        nominal: document.getElementById('form-nominal').value,
        keterangan: document.getElementById('form-keterangan').value,
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
            tutupFormTransaksi();
            loadBukuKas(); 
        } else {
            alert("Gagal menyimpan: " + result.data.message);
        }
    } catch (error) { alert("Error jaringan. Transaksi gagal dikirim."); } 
    finally { btnSimpan.innerText = "💾 Simpan Transaksi"; btnSimpan.disabled = false; }
}
