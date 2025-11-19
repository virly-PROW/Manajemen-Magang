# Panduan Testing Push Notification

Dokumen ini berisi daftar lengkap semua bagian aplikasi yang mengirim push notification.

## 📱 Daftar Fitur dengan Push Notification

### 1. **Logbook Siswa** (`/logbook`)
   - **Trigger**: Ketika siswa mengirim logbook baru
   - **Penerima**: Semua guru
   - **Notifikasi**: "Logbook Baru Dikirim"
   - **Cara Test**:
     1. Login sebagai siswa
     2. Buat logbook baru
     3. Submit logbook
     4. ✅ Push notification akan dikirim ke semua guru

### 2. **Logbook Guru** (`/logbook`)
   - **Trigger**: Ketika guru menyetujui atau menolak logbook
   - **Penerima**: Semua siswa
   - **Notifikasi**:
     - "Logbook Disetujui" (ketika status = disetujui)
     - "Logbook Ditolak" (ketika status = ditolak)
   - **Cara Test**:
     1. Login sebagai guru
     2. Buka logbook siswa yang statusnya "menunggu"
     3. Klik "Setujui" atau "Tolak"
     4. ✅ Push notification akan dikirim ke semua siswa

### 3. **Pendaftaran Magang** (`/magang`)
   - **Trigger**: Ketika siswa mendaftar magang ke DUDI
   - **Penerima**: Semua guru
   - **Notifikasi**: "Pendaftaran Magang Baru"
   - **Cara Test**:
     1. Login sebagai siswa
     2. Daftar magang ke DUDI
     3. Submit pendaftaran
     4. ✅ Push notification akan dikirim ke semua guru

### 4. **Status Pendaftaran Magang** (`/magang`)
   - **Trigger**: Ketika admin/guru mengubah status pendaftaran magang
   - **Penerima**: Semua siswa
   - **Notifikasi**:
     - "Pendaftaran Magang Diterima" (ketika status = diterima)
     - "Pendaftaran Magang Ditolak" (ketika status = ditolak)
   - **Cara Test**:
     1. Login sebagai admin/guru
     2. Buka halaman magang
     3. Ubah status pendaftaran menjadi "diterima" atau "ditolak"
     4. ✅ Push notification akan dikirim ke semua siswa

### 5. **Selesai Magang** (`/magang`)
   - **Trigger**: Ketika status magang diubah menjadi "selesai"
   - **Penerima**: Semua guru
   - **Notifikasi**: "Siswa Selesai Magang"
   - **Cara Test**:
     1. Login sebagai admin/guru
     2. Buka halaman magang
     3. Ubah status magang menjadi "selesai"
     4. ✅ Push notification akan dikirim ke semua guru

## 🔧 API Endpoints yang Mengirim Push Notification

### 1. `POST /api/notifications`
   - **Fungsi**: Membuat notifikasi umum (bisa untuk siswa atau guru)
   - **Mengirim Push**: ✅ Ya
   - **Digunakan oleh**: 
     - `createNotificationClient()` function

### 2. `POST /api/notifications/create-for-all-guru`
   - **Fungsi**: Membuat notifikasi untuk semua guru
   - **Mengirim Push**: ✅ Ya
   - **Digunakan oleh**:
     - LogbookSiswa.tsx (logbook baru)
     - MagangTable.tsx (siswa selesai magang)
     - DudiRegistrationForm.tsx (pendaftaran magang baru)

### 3. `POST /api/notifications/create-for-all-siswa`
   - **Fungsi**: Membuat notifikasi untuk semua siswa
   - **Mengirim Push**: ✅ Ya
   - **Digunakan oleh**:
     - LogbookGuru.tsx (logbook disetujui/ditolak)
     - MagangTable.tsx (pendaftaran magang diterima/ditolak)

### 4. `POST /api/notifications/create`
   - **Fungsi**: Membuat notifikasi untuk user spesifik (dengan nisn/email)
   - **Mengirim Push**: ❌ Tidak (hanya membuat notifikasi di database)
   - **Catatan**: Endpoint ini tidak mengirim push notification

## 📋 Checklist Testing

Gunakan checklist ini untuk memastikan semua push notification berfungsi:

### Testing sebagai Siswa:
- [ ] Kirim logbook baru → Semua guru menerima push notification
- [ ] Daftar magang → Semua guru menerima push notification
- [ ] Status pendaftaran diterima → Semua siswa menerima push notification
- [ ] Status pendaftaran ditolak → Semua siswa menerima push notification
- [ ] Logbook disetujui → Semua siswa menerima push notification
- [ ] Logbook ditolak → Semua siswa menerima push notification

### Testing sebagai Guru:
- [ ] Setujui logbook → Semua siswa menerima push notification
- [ ] Tolak logbook → Semua siswa menerima push notification
- [ ] Terima pendaftaran magang → Semua siswa menerima push notification
- [ ] Tolak pendaftaran magang → Semua siswa menerima push notification
- [ ] Ubah status magang menjadi selesai → Semua guru menerima push notification

### Testing Push Notification Setup:
- [ ] Pastikan browser mendukung push notification
- [ ] Aktifkan push notification di settings (via PushNotificationToggle)
- [ ] Cek subscription di database table `push_subscriptions`
- [ ] Test dengan browser yang berbeda (Chrome, Edge, Firefox)

## 🔍 Cara Debug Push Notification

1. **Cek Console Browser**:
   - Buka Developer Tools (F12)
   - Cek tab Console untuk error
   - Cek tab Application → Service Workers

2. **Cek Server Logs**:
   - Cek terminal/console server
   - Cari log: `📱 Push notification sent to X devices`

3. **Cek Database**:
   - Table `push_subscriptions`: cek apakah subscription tersimpan
   - Table `notifications`: cek apakah notifikasi dibuat

4. **Test Manual via API**:
   ```bash
   POST /api/push/send
   {
     "role": "siswa",
     "title": "Test Notification",
     "message": "Ini adalah test push notification",
     "link": "/"
   }
   ```

## ⚠️ Catatan Penting

1. **Push notification hanya dikirim jika**:
   - User sudah subscribe (aktifkan di settings)
   - Browser mendukung push notification
   - Service worker sudah terdaftar

2. **Push notification TIDAK dikirim jika**:
   - Notifikasi duplikat (dalam 2 menit terakhir dengan title yang sama)
   - User belum subscribe
   - Browser tidak mendukung

3. **Role-based notification**:
   - Notifikasi untuk "siswa" dikirim ke **SEMUA** siswa yang sudah subscribe (tidak spesifik per NISN/email)
   - Notifikasi untuk "guru" dikirim ke **SEMUA** guru yang sudah subscribe
   - Semua notifikasi bersifat broadcast ke semua user dengan role yang sama

## 🔔 Slide-Down Notification (Real-time UI Notification)

Fitur baru: Notifikasi slide-down yang muncul dari atas halaman secara real-time.

### Fitur:
- ✅ Muncul sebagai notifikasi slide-down dari atas halaman
- ✅ Hanya muncul di halaman dengan role yang sesuai:
  - Notifikasi untuk "guru" hanya muncul saat user berada di halaman dengan role "Guru"
  - Notifikasi untuk "siswa" hanya muncul saat user berada di halaman dengan role "Siswa"
- ✅ Auto-close setelah 5 detik
- ✅ Bisa ditutup manual dengan tombol X
- ✅ Klik notifikasi untuk navigasi ke halaman terkait
- ✅ Real-time detection via polling (setiap 10 detik) dan event listener

### Cara Kerja:
1. Sistem melakukan polling setiap 10 detik untuk cek notifikasi baru
2. Sistem juga mendengarkan event `notification:created` untuk real-time update
3. Notifikasi hanya ditampilkan jika:
   - Role notifikasi cocok dengan role halaman saat ini
   - Notifikasi belum pernah ditampilkan sebelumnya (berdasarkan ID)
4. Notifikasi muncul dengan animasi slide-down dari atas
5. Auto-close setelah 5 detik atau bisa ditutup manual

### Testing Slide-Down Notification:

#### Test sebagai Guru:
1. **Buka halaman dengan role "Guru"** (toggle ke "Guru")
2. **Di browser/tab lain, login sebagai siswa** dan:
   - Kirim logbook baru → ✅ Notifikasi slide-down muncul di halaman Guru
   - Daftar magang → ✅ Notifikasi slide-down muncul di halaman Guru
3. **Ubah role ke "Siswa"** → ✅ Notifikasi untuk guru TIDAK muncul
4. **Kembali ke role "Guru"** → ✅ Notifikasi untuk guru muncul lagi

#### Test sebagai Siswa:
1. **Buka halaman dengan role "Siswa"** (toggle ke "Siswa")
2. **Di browser/tab lain, login sebagai guru** dan:
   - Setujui/tolak logbook siswa → ✅ Notifikasi slide-down muncul di halaman Siswa
   - Terima/tolak pendaftaran magang → ✅ Notifikasi slide-down muncul di halaman Siswa
3. **Ubah role ke "Guru"** → ✅ Notifikasi untuk siswa TIDAK muncul
4. **Kembali ke role "Siswa"** → ✅ Notifikasi untuk siswa muncul lagi

### Checklist Testing Slide-Down Notification:
- [ ] Notifikasi untuk guru muncul saat role = "Guru"
- [ ] Notifikasi untuk guru TIDAK muncul saat role = "Siswa"
- [ ] Notifikasi untuk siswa muncul saat role = "Siswa"
- [ ] Notifikasi untuk siswa TIDAK muncul saat role = "Guru"
- [ ] Notifikasi auto-close setelah 5 detik
- [ ] Notifikasi bisa ditutup manual dengan tombol X
- [ ] Klik notifikasi navigasi ke halaman terkait
- [ ] Notifikasi tidak muncul duplikat (notifikasi yang sama hanya muncul sekali)
- [ ] Notifikasi muncul dengan animasi slide-down yang smooth

### Catatan Penting Slide-Down Notification:
1. **Role-based filtering**: Notifikasi hanya muncul jika role notifikasi cocok dengan role halaman saat ini
2. **Tidak perlu subscribe**: Slide-down notification muncul untuk semua user, tidak perlu subscribe push notification
3. **Real-time**: Notifikasi muncul dalam 10 detik setelah dibuat (polling interval) atau segera jika ada event `notification:created`
4. **Auto-refresh**: Saat role berubah, sistem akan reset dan cek notifikasi baru untuk role tersebut

