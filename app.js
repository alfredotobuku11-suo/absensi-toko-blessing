const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/library/d/1UqEWMaqR4pKn1QM1MGTjPIt7sFmka5XgS65QaUDZ5nf0dEcWz87R-EAo/24"; 

let html5QrcodeScanner;
const statusBox = document.getElementById("status-box");
const syncBtn = document.getElementById("sync-btn");


function showStatus(pesan, tipe) {
    statusBox.innerText = pesan;
    statusBox.className = tipe;
    statusBox.style.display = "block";
    
    setTimeout(() => {
        statusBox.style.display = "none";
    }, 5000);
}

function onScanSuccess(qrCodeMessage) {
    try { navigator.vibrate(200); } catch(e) {} 
    
    html5QrcodeScanner.pause();

    const timestampNow = Date.now();
    const dataAbsen = {
        id: qrCodeMessage,
        waktu: timestampNow
    };

    if (navigator.onLine) {
        kirimKeServer(dataAbsen);
    } else {
        simpanKeLokal(dataAbsen);
        showStatus("📶 Offline. Absen " + qrCodeMessage + " disimpan di HP.", "offline");
        
        setTimeout(() => { html5QrcodeScanner.resume(); }, 3000);
    }
}

function simpanKeLokal(data) {
    let antrean = JSON.parse(localStorage.getItem('antreanAbsen')) || [];
    antrean.push(data);
    localStorage.setItem('antreanAbsen', JSON.stringify(antrean));
    cekAntreanOffline();
}

function kirimKeServer(data) {
    showStatus("Memproses data...", "offline");
    
    const url = GOOGLE_SCRIPT_URL + "?id=" + encodeURIComponent(data.id) + "&waktu=" + data.waktu;

    fetch(url)
        .then(response => response.json())
        .then(result => {
            if (result.status === "sukses") {
                showStatus("✅ Absen Berhasil! Nama: " + result.nama, "sukses");
            } else {
                showStatus("⚠️ Gagal: " + result.pesan, "offline");
            }
        })
        .catch(error => {
            simpanKeLokal(data);
            showStatus("Koneksi gagal. Disimpan offline.", "offline");
        })
        .finally(() => {
            setTimeout(() => { html5QrcodeScanner.resume(); }, 3000);
        });
}

function cekAntreanOffline() {
    let antrean = JSON.parse(localStorage.getItem('antreanAbsen')) || [];
    if (antrean.length > 0) {
        syncBtn.style.display = "block";
        syncBtn.innerText = "⬆️ Kirim " + antrean.length + " Data Tertunda";
    } else {
        syncBtn.style.display = "none";
    }
}

function syncData() {
    if (!navigator.onLine) {
        alert("Anda masih offline! Cari sinyal internet dulu.");
        return;
    }

    let antrean = JSON.parse(localStorage.getItem('antreanAbsen')) || [];
    if (antrean.length === 0) return;

    syncBtn.innerText = "🔄 Mengirim...";
    syncBtn.disabled = true;

    let dataTeratas = antrean[0];

    const url = GOOGLE_SCRIPT_URL + "?id=" + encodeURIComponent(dataTeratas.id) + "&waktu=" + dataTeratas.waktu;

    fetch(url)
        .then(response => response.json())
        .then(result => {
            if (result.status === "sukses") {
                antrean.shift();
                localStorage.setItem('antreanAbsen', JSON.stringify(antrean));
                
                cekAntreanOffline();
                if(antrean.length > 0) {
                     syncData();
                } else {
                     syncBtn.disabled = false;
                     showStatus("✅ Semua data offline berhasil dikirim!", "sukses");
                }
            }
        })
        .catch(err => {
            alert("Gagal sinkronisasi. Coba lagi nanti.");
            syncBtn.disabled = false;
            cekAntreanOffline();
        });
}

html5QrcodeScanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 });
html5QrcodeScanner.render(onScanSuccess);

cekAntreanOffline();

window.addEventListener('online',  syncData);
