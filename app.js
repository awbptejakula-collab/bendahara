// --- KONFIGURASI ---
const GAS_URL = "https://script.google.com/macros/s/AKfycbyYVyWUnwtZaY1IeI4EigdtxcvjBYmqHIQlKhZzs0UcIrU5nSU-ikafbvpyUgsY3roh/exec"; 
let currentUserRole = "";

// --- FUNGSI NAVIGASI ---
function login() {
    currentUserRole = document.getElementById('role-select').value;
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('dashboard-screen').classList.remove('hidden');
    document.getElementById('welcome-text').innerText = "Buku Kas - Akses: " + currentUserRole;
    
    // Langsung tarik data saat berhasil login
    loadBukuKas();
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
        // Memanggil fungsi doGet di Apps Script
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
        // Format tanggal (mengambil bagian tanggalnya saja)
        let tgl = new Date(transaksi.tanggal).toLocaleDateString('id-ID');
        
        // Format Rupiah
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
