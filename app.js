// --- KONFIGURASI ---
// PENTING: Paste URL Apps Script Anda di bawah ini!
const GAS_URL = "https://script.google.com/macros/s/AKfycbyYVyWUnwtZaY1IeI4EigdtxcvjBYmqHIQlKhZzs0UcIrU5nSU-ikafbvpyUgsY3roh/exec"; 
let currentUserRole = "";

// Database user sederhana untuk uji coba
const dataUser = {
    "admin": { password: "123", role: "Admin" },
    "benda1": { password: "123", role: "Bendahara 1" },
    "benda2": { password: "123", role: "Bendahara 2" }
};

// --- FUNGSI NAVIGASI & LOGIN ---
function prosesLogin() {
    const user = document.getElementById('input-username').value.trim();
    const pass = document.getElementById('input-password').value.trim();
    const errorMsg = document.getElementById('login-error');

    // Cek apakah username ada di database dan passwordnya cocok
    if (dataUser[user] && dataUser[user].password === pass) {
        // Jika Berhasil
        currentUserRole = dataUser[user].role;
        
        // Bersihkan kolom input
        document.getElementById('input-username').value = "";
        document.getElementById('input-password').value = "";
        errorMsg.classList.add('hidden'); // Sembunyikan pesan error

        // Pindah halaman
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('dashboard-screen').classList.remove('hidden');
        document.getElementById('welcome-text').innerText = "Buku Kas - Akses: " + currentUserRole;
        
        // Tarik data
        loadBukuKas();
    } else {
        // Jika Gagal
        errorMsg.classList.remove('hidden'); // Munculkan pesan error
    }
}

function logout() {
    currentUserRole = "";
    document.getElementById('dashboard-screen').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('tabel-kas').innerHTML = ""; // Bersihkan tabel
}

// --- FUNGSI API (KONEKSI KE DATABASE) ---
async function loadBukuKas() {
    const loadingText = document.getElementById('loading-text');
    const tabelKas = document.getElementById('tabel-kas');
    
    loadingText.classList.remove('hidden');
    tabelKas.innerHTML = "";

    try {
        const response = await fetch(GAS_URL + "?action=getBukuKas");
        const result = await response.json();

        if (result.status === 'ok') {
            tampilkanDataKeTabel(result.data);
        } else {
            alert("Error dari server: " + result.data.error);
        }
    } catch (error) {
        alert("Gagal menghubungi server. Pastikan koneksi internet aktif.");
        console.error(error);
    } finally {
        loadingText.classList.add('hidden');
    }
}

// --- FUNGSI TAMPILAN ---
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
        tr.innerHTML = `
            <td>${tgl}</td>
            <td>${transaksi.kategori}</td>
            <td>${transaksi.jenis}</td>
            <td style="text-align:right;">${nominalRp}</td>
        `;
        tabelKas.appendChild(tr);
    });
}
