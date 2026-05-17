// ==========================================
// KONFIGURASI 
// ==========================================
// PASTE URL WEB APP ANDA DI SINI:
const GAS_URL = "https://script.google.com/macros/s/AKfycbyYVyWUnwtZaY1IeI4EigdtxcvjBYmqHIQlKhZzs0UcIrU5nSU-ikafbvpyUgsY3roh/exec"; 

let currentUserRole = "";
let dataKategori = [];
let dataAnggota = [];
let globalDataTransaksi = []; // Menampung semua data kas
let base64FotoTemp = ""; 

// ==========================================
// FUNGSI LOGIN & NAVIGASI
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

            document.getElementById('menu-role-text').innerText = "Akses: " + currentUserRole;
            document.getElementById('btn-menu-tambah').classList.toggle('hidden', currentUserRole === "Admin");

            navigasi('main-menu-screen'); // Buka Menu Utama
            
            // Tarik data secara background saat login sukses
            loadDataServer();
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
    currentUserRole = ""; base64FotoTemp = ""; globalDataTransaksi = [];
    document.querySelectorAll('.container > div').forEach(div => div.classList.add('hidden'));
    document.getElementById('login-screen').classList.remove('hidden');
}

function navigasi(idTujuan) {
    // Sembunyikan semua layar
    document.querySelectorAll('.container > div').forEach(div => div.classList.add('hidden'));
    // Munculkan layar tujuan
    document.getElementById(idTujuan).classList.remove('hidden');
    
    // Render ulang tabel jika masuk ke layar tabel (tanpa fetch server)
    if(idTujuan === 'dashboard-screen') renderTabelKas();
    if(idTujuan === 'iuran-screen') renderTabelIuran();
}

// ==========================================
// FUNGSI TARIK & RENDER DATA
// ==========================================
async function loadDataServer() {
    document.getElementById('loading-text-kas').classList.remove('hidden');
    document.getElementById('loading-text-iuran').classList.remove('hidden');
    
    try {
        const res = await fetch(GAS_URL + "?action=getBukuKas");
        const json = await res.json();
        if (json.status === 'ok') {
            globalDataTransaksi = json.data; // Simpan ke RAM
            renderTabelKas();
            renderTabelIuran();
        }
    } catch (e) { console.error(e); } 
    finally { 
        document.getElementById('loading-text-kas').classList.add('hidden');
        document.getElementById('loading-text-iuran').classList.add('hidden');
    }
}

function renderTabelKas() {
    const table = document.getElementById('tabel-kas');
    table.innerHTML = "";
    if (globalDataTransaksi.length === 0) {
        table.innerHTML = "<tr><td colspan='3'>Belum ada transaksi.</td></tr>"; return;
    }
    
    globalDataTransaksi.forEach(tr => {
        let tgl = new Date(tr.tanggal).toLocaleDateString('id-ID', {day: 'numeric', month:'short'});
        let nominal = new Intl.NumberFormat('id-ID').format(tr.nominal);
        let warnaNominal = tr.jenis === "Pendapatan" ? "green" : "red";
        
        // Gabungkan info pihak, keterangan, dan pencatat di satu kolom agar ringkas
        let ket = `<b>${tr.kategori}</b><br><small>${tr.pihak}</small>`;
        if(tr.keterangan) ket += `<br><small style="color:#666;"><i>${tr.keterangan}</i></small>`;
        ket += `<br><span class="badge-sumber">${tr.sumber}</span>`; 
        
        let row = document.createElement('tr');
        row.innerHTML = `<td>${tgl}</td><td>${ket}</td><td style="text-align:right; color:${warnaNominal}; font-weight:bold;">${nominal}</td>`;
        table.appendChild(row);
    });
}

function renderTabelIuran() {
    const table = document.getElementById('tabel-iuran');
    table.innerHTML = "";
    
    // Filter khusus Iuran Wajib
    const dataIuran = globalDataTransaksi.filter(tr => tr.kategori === "Iuran Wajib");
    
    if (dataIuran.length === 0) {
        table.innerHTML = "<tr><td colspan='3'>Belum ada iuran wajib.</td></tr>"; return;
    }
    
    dataIuran.forEach(tr => {
        let tgl = new Date(tr.tanggal).toLocaleDateString('id-ID', {day: 'numeric', month:'short'});
        let nominal = new Intl.NumberFormat('id-ID').format(tr.nominal);
        
        // Tampilkan Nama atau Kelompok
        let namaTampil = tr.pihak || tr.kelompok || "Anggota";
        let info = `<b>${namaTampil}</b>`;
        if(tr.keterangan) info += `<br><small style="color:#666;"><i>${tr.keterangan}</i></small>`;
        info += `<br><span class="badge-sumber">${tr.sumber}</span>`;
        
        let row = document.createElement('tr');
        row.innerHTML = `<td>${tgl}</td><td>${info}</td><td style="text-align:right;">${nominal}</td>`;
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
// FUNGSI FORM TRANSAKSI DINAMIS 
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
            hintNominal.innerText = `* Tarif Rp ${tarifKK[jenisKK].toLocaleString('id-ID')} dikali ${jumlahPeriode} periode. Bisa diedit jika kolektif.`;
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
            loadDataServer(); // Langsung perbarui data memori
            navigasi('main-menu-screen'); // Kembali ke menu utama
        } else {
            alert("Gagal menyimpan: " + result.data.message);
        }
    } catch (error) { alert("Error jaringan. Transaksi gagal dikirim."); } 
    finally { btnSimpan.innerText = "💾 Simpan Transaksi"; btnSimpan.disabled = false; }
}
