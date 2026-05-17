// ==========================================
// KONFIGURASI UTAMA
// ==========================================
const GAS_URL = "https://script.google.com/macros/s/AKfycbyYVyWUnwtZaY1IeI4EigdtxcvjBYmqHIQlKhZzs0UcIrU5nSU-ikafbvpyUgsY3roh/exec"; 

let currentUserRole = "";
let dataKategori = [];
let dataAnggota = [];

// ==========================================
// FUNGSI NAVIGASI & LOGIN
// ==========================================
async function prosesLogin() {
    const user = document.getElementById('input-username').value.trim();
    const pass = document.getElementById('input-password').value.trim();
    const errorMsg = document.getElementById('login-error');
    
    if (!user || !pass) {
        errorMsg.innerText = "Username dan password harus diisi!";
        errorMsg.classList.remove('hidden');
        return;
    }

    const btn = document.querySelector('button[onclick="prosesLogin()"]');
    btn.innerText = "Memeriksa...";
    btn.disabled = true;

    try {
        const response = await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'login', payload: { username: user, password: pass } }),
            headers: { "Content-Type": "text/plain;charset=utf-8" }
        });
        const result = await response.json();

        if (result.status === 'ok' && result.data.status === 'success') {
            currentUserRole = result.data.role;
            
            document.getElementById('input-username').value = "";
            document.getElementById('input-password').value = "";
            errorMsg.classList.add('hidden');

            document.getElementById('login-screen').classList.add('hidden');
            document.getElementById('dashboard-screen').classList.remove('hidden');
            document.getElementById('welcome-text').innerText = "Buku Kas - " + currentUserRole;
            
            // Sembunyikan tombol tambah jika yang login adalah Admin (opsional, jika admin tidak boleh input)
            if(currentUserRole === "Admin") {
                document.getElementById('btn-tambah').classList.add('hidden');
            } else {
                document.getElementById('btn-tambah').classList.remove('hidden');
            }

            // Tarik data Buku Kas & Data Referensi (Kategori & Anggota)
            loadBukuKas();
            tarikDataReferensi(); 
        } else {
            errorMsg.innerText = result.data.message || "Login gagal!";
            errorMsg.classList.remove('hidden');
        }
    } catch (error) {
        errorMsg.innerText = "Gagal terhubung ke server.";
        errorMsg.classList.remove('hidden');
    } finally {
        btn.innerText = "Masuk";
        btn.disabled = false;
    }
}

function logout() {
    currentUserRole = "";
    document.getElementById('dashboard-screen').classList.add('hidden');
    document.getElementById('form-screen').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('tabel-kas').innerHTML = ""; 
}

// ==========================================
// FUNGSI DASHBOARD (LOAD TABEL)
// ==========================================
async function loadBukuKas() {
    const loadingText = document.getElementById('loading-text');
    const tabelKas = document.getElementById('tabel-kas');
    loadingText.classList.remove('hidden');
    tabelKas.innerHTML = "";

    try {
        const response = await fetch(GAS_URL + "?action=getBukuKas");
        const result = await response.json();
        if (result.status === 'ok') tampilkanDataKeTabel(result.data);
    } catch (error) {
        console.error(error);
    } finally {
        loadingText.classList.add('hidden');
    }
}

function tampilkanDataKeTabel(data) {
    const tabelKas = document.getElementById('tabel-kas');
    if (data.length === 0) {
        tabelKas.innerHTML = "<tr><td colspan='4' style='text-align:center;'>Belum ada transaksi.</td></tr>";
        return;
    }
    data.forEach(transaksi => {
        let tgl = new Date(transaksi.tanggal).toLocaleDateString('id-ID');
        let nominalRp = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(transaksi.nominal);
        let tr = document.createElement('tr');
        tr.innerHTML = `<td>${tgl}</td><td>${transaksi.kategori}</td><td>${transaksi.jenis}</td><td style="text-align:right;">${nominalRp}</td>`;
        tabelKas.appendChild(tr);
    });
}

// ==========================================
// FUNGSI FORM TRANSAKSI
// ==========================================
// Menarik daftar Kategori & Anggota dari Sheet ke memori PWA
async function tarikDataReferensi() {
    try {
        let resKat = await fetch(GAS_URL + "?action=getKategori");
        let jsonKat = await resKat.json();
        if(jsonKat.status === 'ok') dataKategori = jsonKat.data;

        let resAng = await fetch(GAS_URL + "?action=getAnggotaDropdown");
        let jsonAng = await resAng.json();
        if(jsonAng.status === 'ok') dataAnggota = jsonAng.data;
    } catch (error) {
        console.error("Gagal menarik data referensi", error);
    }
}

// Membuka layar form
function bukaFormTransaksi() {
    document.getElementById('dashboard-screen').classList.add('hidden');
    document.getElementById('form-screen').classList.remove('hidden');
    
    // Set default tanggal hari ini
    document.getElementById('form-tanggal').valueAsDate = new Date();
    document.getElementById('form-nominal').value = "";
    document.getElementById('form-keterangan').value = "";
    
    updateDropdownKategori();
}

function tutupFormTransaksi() {
    document.getElementById('form-screen').classList.add('hidden');
    document.getElementById('dashboard-screen').classList.remove('hidden');
}

// Mengubah isi dropdown kategori berdasarkan jenis (Pendapatan/Pengeluaran)
function updateDropdownKategori() {
    const jenisDipilih = document.getElementById('form-jenis').value;
    const dropdownKat = document.getElementById('form-kategori');
    dropdownKat.innerHTML = "";

    const kategoriTersaring = dataKategori.filter(k => k.jenis === jenisDipilih);
    kategoriTersaring.forEach(k => {
        let opt = document.createElement('option');
        opt.value = k.nama;
        opt.innerText = k.nama;
        dropdownKat.appendChild(opt);
    });
    
    cekTampilAnggota(); // Cek apakah kategori awal adalah Iuran
}

// Memunculkan dropdown anggota hanya jika kategori = "Iuran Wajib"
function cekTampilAnggota() {
    const katDipilih = document.getElementById('form-kategori').value;
    const grupAnggota = document.getElementById('grup-anggota');
    const dropdownAnggota = document.getElementById('form-anggota');
    
    if (katDipilih === "Iuran Wajib") {
        grupAnggota.classList.remove('hidden');
        dropdownAnggota.innerHTML = '<option value="">-- Pilih Anggota --</option>';
        dataAnggota.forEach(a => {
            let opt = document.createElement('option');
            opt.value = a.id_anggota;
            opt.innerText = a.nama_anggota;
            dropdownAnggota.appendChild(opt);
        });
    } else {
        grupAnggota.classList.add('hidden');
        dropdownAnggota.innerHTML = ""; // Kosongkan
    }
}

// Mengirim data ke Google Sheet
async function simpanDataTransaksi() {
    const tanggal = document.getElementById('form-tanggal').value;
    const jenis = document.getElementById('form-jenis').value;
    const kategori = document.getElementById('form-kategori').value;
    const id_anggota = document.getElementById('form-anggota').value;
    const pembayaran = document.getElementById('form-pembayaran').value;
    const nominal = document.getElementById('form-nominal').value;
    const keterangan = document.getElementById('form-keterangan').value;

    if (!tanggal || !nominal) {
        alert("Tanggal dan Nominal harus diisi!");
        return;
    }
    if (kategori === "Iuran Wajib" && !id_anggota) {
        alert("Pilih anggota yang membayar iuran!");
        return;
    }

    const btnSimpan = document.getElementById('btn-simpan');
    btnSimpan.innerText = "⏳ Menyimpan...";
    btnSimpan.disabled = true;

    // Siapkan data sesuai kebutuhan Backend
    const payloadData = {
        role: currentUserRole, // Menentukan masuk ke sheet B1 atau B2
        tanggal: tanggal,
        jenis: jenis,
        kategori: kategori,
        id_anggota: id_anggota || "",
        jenis_pembayaran: pembayaran,
        nominal: nominal,
        keterangan: keterangan
    };

    try {
        const response = await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'simpanTransaksi', payload: payloadData }),
            headers: { "Content-Type": "text/plain;charset=utf-8" }
        });
        const result = await response.json();

        if (result.status === 'ok' && result.data.status === 'success') {
            alert("✅ Transaksi berhasil disimpan!");
            tutupFormTransaksi();
            loadBukuKas(); // Refresh tabel setelah menyimpan
        } else {
            alert("Gagal menyimpan: " + result.data.message);
        }
    } catch (error) {
        alert("Error jaringan. Transaksi gagal dikirim.");
    } finally {
        btnSimpan.innerText = "💾 Simpan Transaksi";
        btnSimpan.disabled = false;
    }
}
