// ==========================================
// KONFIGURASI UTAMA
// ==========================================
// Paste URL Web App dari Google Apps Script di bawah ini:
const GAS_URL = "https://script.google.com/macros/s/AKfycbyYVyWUnwtZaY1IeI4EigdtxcvjBYmqHIQlKhZzs0UcIrU5nSU-ikafbvpyUgsY3roh/exec"; 

let currentUserRole = "";

// ==========================================
// FUNGSI NAVIGASI & LOGIN
// ==========================================
async function prosesLogin() {
    const user = document.getElementById('input-username').value.trim();
    const pass = document.getElementById('input-password').value.trim();
    const errorMsg = document.getElementById('login-error');
    
    // Validasi input kosong
    if (!user || !pass) {
        errorMsg.innerText = "Username dan password harus diisi!";
        errorMsg.classList.remove('hidden');
        return;
    }

    // Ubah tombol jadi status loading
    const btn = document.querySelector('button[onclick="prosesLogin()"]');
    btn.innerText = "Memeriksa...";
    btn.disabled = true;

    try {
        // Mengirim data rahasia lewat POST ke Backend GAS
        const response = await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'login',
                payload: { username: user, password: pass }
            }),
            headers: {
                "Content-Type": "text/plain;charset=utf-8", 
            }
        });
        
        const result = await response.json();

        // Jika GAS merespon login sukses
        if (result.status === 'ok' && result.data.status === 'success') {
            currentUserRole = result.data.role;
            
            // Bersihkan form
            document.getElementById('input-username').value = "";
            document.getElementById('input-password').value = "";
            errorMsg.classList.add('hidden');

            // Pindah ke Dashboard
            document.getElementById('login-screen').classList.add('hidden');
            document.getElementById('dashboard-screen').classList.remove('hidden');
            document.getElementById('welcome-text').innerText = "Buku Kas - Akses: " + currentUserRole;
            
            // Otomatis tarik data kas
            loadBukuKas();
        } else {
            // Jika login gagal (user/pass salah)
            errorMsg.innerText = result.data.message || "Login gagal!";
            errorMsg.classList.remove('hidden');
        }
    } catch (error) {
        errorMsg.innerText = "Gagal terhubung ke server. Periksa koneksi internet.";
        errorMsg.classList.remove('hidden');
    } finally {
        // Kembalikan tombol seperti semula
        btn.innerText = "Masuk";
        btn.disabled = false;
    }
}

function logout() {
    currentUserRole = "";
    document.getElementById('dashboard-screen').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('tabel-kas').innerHTML = ""; // Bersihkan memori tabel
}

// ==========================================
// FUNGSI API (KONEKSI KE DATABASE / GET BUKU KAS)
// ==========================================
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

// ==========================================
// FUNGSI TAMPILAN
// ==========================================
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
