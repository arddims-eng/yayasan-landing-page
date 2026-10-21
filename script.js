/* =============================================================
   script.js — Logika interaktif landing page Yayasan Prakarsa Amal Mulia

   Daftar isi:
     1. Konfigurasi
     2. Fungsi bantu
     3. Validasi input
     4. Navigasi antar "halaman"
     5. Donasi (pilih program, metode, nominal, kirim ke WhatsApp)
     6. Menu mobile (hamburger)
     7. Tema terang / gelap
     8. Lightbox logo
     9. Animasi scroll + inisialisasi

   Catatan keamanan: file ini TIDAK berisi password atau API key.
   Nomor WhatsApp yayasan bersifat publik (memang tampil di link wa.me).
   ============================================================= */
'use strict';

/* ---------- 1. Konfigurasi ---------- */

const NOMOR_WA_BELUM_DIISI = '628000000000'; // nilai contoh bawaan

const KONFIG = Object.freeze({
  // GANTI dengan nomor WhatsApp yayasan: format 62..., tanpa "+", spasi, atau "0" di depan.
  // Contoh: 6281234567890. Selama masih berisi nilai contoh, tombol donasi tidak akan membuka WhatsApp.
  NOMOR_WA: NOMOR_WA_BELUM_DIISI,
  NOMINAL_MAKS: 100000000000, // batas atas nominal: Rp100 miliar (untuk menolak angka tidak masuk akal)
  DOA_MAKS_KARAKTER: 500,     // panjang maksimal doa/pesan (sama dengan maxlength di HTML)
  KUNCI_TEMA: 'tema',         // nama penyimpanan pilihan tema di browser
});

// Kode metode (dari atribut HTML) -> nama yang ditampilkan & dikirim ke WA
const METODE_DONASI = Object.freeze({ bank: 'Transfer Bank', qris: 'QRIS' });

// Halaman tambahan selain beranda (beranda = elemen berkelas .halaman-utama-part)
const ID_HALAMAN_TAMBAHAN = ['halaman-donasi', 'halaman-kegiatan', 'halaman-legalitas'];

// Pilihan donatur saat ini (diisi lewat klik kartu program & tombol metode)
const pilihan = { namaProgram: null, idKartuProgram: null, namaMetode: null };

// Semua menu mobile yang sudah terpasang (dipakai untuk menutup semuanya sekaligus)
const daftarMenuMobile = [];

/* ---------- 2. Fungsi bantu ---------- */

/** Ambil elemen lewat id. Bisa mengembalikan null kalau elemen tidak ada. */
function ambil(id) {
  return document.getElementById(id);
}

/** Tampilkan elemen (aman dipanggil dengan null). */
function tampilkan(elemen) {
  if (elemen) elemen.classList.remove('hidden');
}

/** Sembunyikan elemen (aman dipanggil dengan null). */
function sembunyikan(elemen) {
  if (elemen) elemen.classList.add('hidden');
}

/** Ubah teks sebuah elemen berdasarkan id (aman kalau elemen tidak ada). */
function isiTeks(id, teks) {
  const elemen = ambil(id);
  if (elemen) elemen.textContent = teks;
}

/** 120000 -> "Rp120.000" */
function formatRupiah(angka) {
  return 'Rp' + Number(angka).toLocaleString('id-ID');
}

/* ---------- 3. Validasi input ---------- */

/**
 * Cek teks nominal dari kolom input.
 * Kembalian: { valid: true, nilai } atau { valid: false, pesan }.
 */
function validasiNominal(teks) {
  const bersih = String(teks == null ? '' : teks).trim();
  if (bersih === '') {
    return { valid: false, pesan: 'Nominal donasi wajib diisi.' };
  }
  if (!/^\d+$/.test(bersih)) {
    return { valid: false, pesan: 'Nominal harus berupa angka bulat, tanpa titik, koma, atau huruf.' };
  }
  const nilai = Number(bersih);
  if (!Number.isSafeInteger(nilai) || nilai <= 0) {
    return { valid: false, pesan: 'Nominal donasi harus lebih dari Rp0.' };
  }
  if (nilai > KONFIG.NOMINAL_MAKS) {
    return {
      valid: false,
      pesan: 'Nominal terlalu besar (maksimal ' + formatRupiah(KONFIG.NOMINAL_MAKS) + '). Untuk jumlah lebih besar, silakan hubungi pengurus yayasan.',
    };
  }
  return { valid: true, nilai: nilai };
}

/** Nomor WA dianggap valid kalau berformat Indonesia (62 + 8-13 digit) dan sudah bukan nilai contoh. */
function nomorWaValid(nomor) {
  return /^62\d{8,13}$/.test(String(nomor)) && nomor !== NOMOR_WA_BELUM_DIISI;
}

/** Bersihkan teks doa: buang karakter kontrol tak terlihat, rapikan spasi, batasi panjang. */
function bersihkanDoa(teks) {
  return String(teks == null ? '' : teks)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '') // newline (\n) dan tab tetap dipertahankan
    .trim()
    .slice(0, KONFIG.DOA_MAKS_KARAKTER);
}

/** Susun teks pesan yang akan dikirim ke WhatsApp. */
function susunPesanWa(data) {
  let pesan = 'Halo, saya ingin donasi untuk program *' + data.program +
    '* melalui *' + data.metode + '* sebesar *' + formatRupiah(data.nominal) + '*.';
  const doa = bersihkanDoa(data.doa);
  if (doa) pesan += '\n\nDoa/pesan saya: ' + doa;
  return pesan;
}

/* ---------- 4. Navigasi antar "halaman" ---------- */

/** Sembunyikan beranda dan semua halaman tambahan. */
function sembunyikanSemuaHalaman() {
  document.querySelectorAll('.halaman-utama-part').forEach(sembunyikan);
  ID_HALAMAN_TAMBAHAN.forEach(function (id) { sembunyikan(ambil(id)); });
}

/** Buka satu halaman tambahan (donasi / kegiatan / legalitas). */
function tampilkanHalaman(idHalaman) {
  const target = ambil(idHalaman);
  if (!target) {
    // Jangan sembunyikan beranda kalau halaman tujuan tidak ada, supaya layar tidak kosong.
    console.warn('Halaman tidak ditemukan:', idHalaman);
    return;
  }
  sembunyikanSemuaHalaman();
  tampilkan(target);
  target.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('visible'); });
  tutupSemuaMenuMobile();
  window.scrollTo(0, 0);
}

/** Kembali ke beranda. Kalau idTujuan diisi, lanjut menggulir ke bagian itu. */
function kembaliKeBeranda(idTujuan) {
  ID_HALAMAN_TAMBAHAN.forEach(function (id) { sembunyikan(ambil(id)); });
  document.querySelectorAll('.halaman-utama-part').forEach(tampilkan);
  tutupSemuaMenuMobile();
  window.scrollTo(0, 0);
  if (idTujuan) gulirKe(idTujuan);
}

/** Gulir halus ke elemen berdasarkan id (jeda singkat agar tata letak selesai dihitung ulang). */
function gulirKe(id) {
  setTimeout(function () {
    const elemen = ambil(id);
    if (elemen) elemen.scrollIntoView({ behavior: 'smooth' });
  }, 50);
}

/* ---------- 5. Donasi ---------- */

/* 5a. Tampilan kartu program & tombol metode */

/** Ubah tampilan SATU kartu program: terpilih (hijau) atau tidak. */
function tandaiKartuProgram(kartu, terpilih) {
  if (!kartu) return;
  if (terpilih) {
    kartu.classList.remove('bg-brand-50', 'text-brand-900');
    kartu.classList.add('bg-brand-500', 'text-white', 'selected-program');
  } else {
    kartu.classList.remove('bg-brand-500', 'text-white', 'selected-program');
    kartu.classList.add('bg-brand-50', 'text-brand-900');
  }
}

/** Ubah tampilan SATU tombol metode: terpilih atau tidak. */
function tandaiMetode(tombol, terpilih) {
  if (!tombol) return;
  if (terpilih) {
    tombol.classList.remove('bg-white', 'border-brand-100');
    tombol.classList.add('bg-brand-500', 'text-white', 'selected-method');
  } else {
    tombol.classList.remove('bg-brand-500', 'text-white', 'selected-method');
    tombol.classList.add('bg-white', 'border-brand-100');
  }
  tombol.querySelectorAll('span').forEach(function (teks) {
    teks.classList.toggle('text-white', terpilih);
    teks.classList.toggle('text-brand-900', !terpilih);
  });
}

/** Kosongkan pilihan metode (tampilan + data). */
function resetPilihanMetode() {
  document.querySelectorAll('.metode-opt').forEach(function (tombol) { tandaiMetode(tombol, false); });
  pilihan.namaMetode = null;
}

/** Tulis ulang label tombol "Salurkan Donasi" sesuai pilihan saat ini. */
function perbaruiLabelTombolSalurkan() {
  const bagian = ['Salurkan Donasi'];
  if (pilihan.namaProgram) bagian.push(pilihan.namaProgram);
  if (pilihan.namaProgram && pilihan.namaMetode) bagian.push(pilihan.namaMetode);
  isiTeks('btn-salurkan', bagian.join(' \u00b7 '));
}

/** Tampilkan teks peringatan merah di kartu Metode Donasi. */
function tampilkanPeringatanPilihan(teks) {
  isiTeks('warning-program', teks);
  tampilkan(ambil('warning-program'));
}

function sembunyikanPeringatanPilihan() {
  sembunyikan(ambil('warning-program'));
}

/* 5b. Memilih program & metode */

/** Klik kartu program: pilih, atau batalkan kalau kartu yang sama diklik lagi. */
function pilihProgram(namaProgram, idKartu) {
  if (!ambil(idKartu)) {
    console.warn('Kartu program tidak ditemukan:', idKartu);
    return;
  }
  if (pilihan.idKartuProgram === idKartu) {
    batalkanPilihanProgram();
  } else {
    aktifkanPilihanProgram(namaProgram, idKartu);
  }
}

function aktifkanPilihanProgram(namaProgram, idKartu) {
  document.querySelectorAll('.program-card').forEach(function (kartu) { tandaiKartuProgram(kartu, false); });
  tandaiKartuProgram(ambil(idKartu), true);
  pilihan.namaProgram = namaProgram;
  pilihan.idKartuProgram = idKartu;
  sembunyikanPeringatanPilihan();
  perbaruiLabelTombolSalurkan();
  const kartuMetode = ambil('metode-donasi');
  if (kartuMetode) kartuMetode.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function batalkanPilihanProgram() {
  tandaiKartuProgram(ambil(pilihan.idKartuProgram), false);
  pilihan.namaProgram = null;
  pilihan.idKartuProgram = null;
  resetPilihanMetode();
  sembunyikanPeringatanPilihan();
  perbaruiLabelTombolSalurkan();
}

/** Klik tombol metode (Transfer Bank / QRIS). Program harus sudah dipilih lebih dulu. */
function pilihMetode(tombol, kodeMetode) {
  if (!Object.prototype.hasOwnProperty.call(METODE_DONASI, kodeMetode)) {
    console.warn('Kode metode tidak dikenal:', kodeMetode);
    return;
  }
  if (!pilihan.namaProgram) {
    tampilkanPeringatanPilihan('Anda belum memilih program donasi.');
    return;
  }
  document.querySelectorAll('.metode-opt').forEach(function (t) { tandaiMetode(t, false); });
  tandaiMetode(tombol, true);
  pilihan.namaMetode = METODE_DONASI[kodeMetode];
  perbaruiLabelTombolSalurkan();
}

/* 5c. Kartu nominal */

/** Klik tombol "Salurkan Donasi": pastikan pilihan lengkap, lalu buka kartu nominal. */
function kirimDonasi() {
  if (!pilihan.namaProgram) {
    tampilkanPeringatanPilihan('Anda belum memilih program donasi.');
    return;
  }
  if (!pilihan.namaMetode) {
    tampilkanPeringatanPilihan('Silakan pilih metode donasi (Transfer Bank atau QRIS) terlebih dahulu.');
    return;
  }
  bukaModalNominal();
}

function bukaModalNominal() {
  isiTeks('modal-ringkasan', pilihan.namaProgram + ' \u00b7 ' + pilihan.namaMetode);
  const kolom = ambil('input-nominal');
  if (kolom) kolom.value = '0';
  sembunyikanPesanNominal();
  perbaruiPratinjauNominal();
  tampilkan(ambil('modal-nominal'));
}

function tutupModalNominal() {
  sembunyikan(ambil('modal-nominal'));
}

/** Saat kolom nominal difokus: kosongkan nilai awal "0" supaya donatur langsung bisa mengetik. */
function kosongkanJikaNol(kolom) {
  if (kolom && kolom.value === '0') kolom.value = '';
}

/** Perbarui teks kecil "= Rp..." di bawah kolom nominal setiap kali donatur mengetik. */
function perbaruiPratinjauNominal() {
  const kolom = ambil('input-nominal');
  const teks = kolom ? kolom.value.trim() : '';
  const angka = /^\d+$/.test(teks) && Number.isSafeInteger(Number(teks)) ? Number(teks) : 0;
  isiTeks('preview-nominal', '= ' + formatRupiah(angka));
}

function tampilkanPesanNominal(teks) {
  isiTeks('warning-nominal', teks);
  tampilkan(ambil('warning-nominal'));
}

function sembunyikanPesanNominal() {
  sembunyikan(ambil('warning-nominal'));
}

/* 5d. Kirim ke WhatsApp */

/**
 * Buka WhatsApp dengan pesan yang sudah terisi.
 * Kembalian: true kalau berhasil dibuka, false kalau gagal.
 */
function bukaWhatsApp(pesan) {
  let url;
  try {
    url = 'https://wa.me/' + KONFIG.NOMOR_WA + '?text=' + encodeURIComponent(pesan);
  } catch (galat) {
    // encodeURIComponent bisa error kalau teks mengandung karakter rusak (hasil copy-paste emoji terpotong)
    console.error('Pesan tidak bisa dikodekan:', galat);
    return false;
  }
  const jendela = window.open(url, '_blank');
  if (jendela) {
    jendela.opener = null; // jendela baru tidak boleh mengendalikan halaman ini
    return true;
  }
  // Pop-up diblokir browser. Cadangan: pindah langsung ke WhatsApp,
  // tapi hanya kalau halaman ini berdiri sendiri (bukan di dalam frame/pratinjau).
  try {
    if (window.top === window.self) {
      window.location.href = url;
      return true;
    }
  } catch (galat) {
    console.error('Gagal membuka WhatsApp:', galat);
  }
  return false;
}

/** Klik "Lanjutkan ke WA": validasi nominal & nomor tujuan, lalu buka WhatsApp. */
function lanjutkanDonasi() {
  sembunyikanPesanNominal();

  // Jaga-jaga: pilihan program/metode harus masih lengkap
  if (!pilihan.namaProgram || !pilihan.namaMetode) {
    tutupModalNominal();
    kirimDonasi();
    return;
  }

  const kolomNominal = ambil('input-nominal');
  const hasil = validasiNominal(kolomNominal ? kolomNominal.value : '');
  if (!hasil.valid) {
    tampilkanPesanNominal(hasil.pesan);
    return;
  }

  if (!nomorWaValid(KONFIG.NOMOR_WA)) {
    tampilkanPesanNominal('Nomor WhatsApp yayasan belum diatur. Silakan hubungi pengelola situs.');
    return;
  }

  const kolomDoa = ambil('input-doa');
  const pesan = susunPesanWa({
    program: pilihan.namaProgram,
    metode: pilihan.namaMetode,
    nominal: hasil.nilai,
    doa: kolomDoa ? kolomDoa.value : '',
  });

  if (bukaWhatsApp(pesan)) {
    tutupModalNominal();
  } else {
    tampilkanPesanNominal('WhatsApp tidak bisa dibuka. Pastikan pop-up tidak diblokir, lalu coba lagi.');
  }
}

/* ---------- 6. Menu mobile (hamburger) ---------- */

/**
 * Pasang satu menu mobile: tombol hamburger, panel menu, dan 2 garis ikonnya.
 * Setiap halaman punya set id sendiri, jadi fungsi ini dipanggil beberapa kali.
 */
function inisialisasiMenuMobile(idTombol, idMenu, idGaris1, idGaris2) {
  const tombol = ambil(idTombol);
  const menu = ambil(idMenu);
  const garis1 = ambil(idGaris1);
  const garis2 = ambil(idGaris2);
  if (!tombol || !menu || !garis1 || !garis2) {
    console.warn('Menu mobile tidak lengkap, dilewati:', idTombol);
    return;
  }

  let terbuka = false;

  function atur(buka) {
    terbuka = buka;
    menu.classList.toggle('max-h-0', !buka);
    menu.classList.toggle('opacity-0', !buka);
    menu.classList.toggle('max-h-[32rem]', buka);
    menu.classList.toggle('opacity-100', buka);
    garis1.style.top = buka ? '0.375rem' : '0';
    garis1.style.transform = buka ? 'rotate(45deg)' : 'none';
    garis2.style.top = buka ? '0.375rem' : '0.625rem';
    garis2.style.transform = buka ? 'rotate(-45deg)' : 'none';
  }

  tombol.addEventListener('click', function () { atur(!terbuka); });
  daftarMenuMobile.push({ tutup: function () { atur(false); } });
}

function tutupSemuaMenuMobile() {
  daftarMenuMobile.forEach(function (menu) { menu.tutup(); });
}

/* ---------- 7. Tema terang / gelap ---------- */

// Ikon tema ditulis dengan kode unicode agar aman walau server tidak mengirim encoding UTF-8
const IKON_MATAHARI = '\u2600\uFE0F';     // tampil saat mode gelap (klik untuk kembali terang)
const IKON_BULAN = '\uD83C\uDF19';        // tampil saat mode terang (klik untuk gelap)

/** Baca pilihan tema dari penyimpanan browser (bisa null; storage kadang diblokir). */
function bacaTemaTersimpan() {
  try {
    return localStorage.getItem(KONFIG.KUNCI_TEMA);
  } catch (galat) {
    return null;
  }
}

function simpanTema(nama) {
  try {
    localStorage.setItem(KONFIG.KUNCI_TEMA, nama);
  } catch (galat) {
    // diabaikan: tema tetap berganti, hanya saja tidak diingat untuk kunjungan berikutnya
  }
}

function perbaruiIkonTema(gelap) {
  document.querySelectorAll('.theme-icon').forEach(function (ikon) {
    ikon.textContent = gelap ? IKON_MATAHARI : IKON_BULAN;
  });
}

function terapkanTema(gelap) {
  document.documentElement.classList.toggle('dark', gelap);
  perbaruiIkonTema(gelap);
}

/** Klik tombol tema: balik terang <-> gelap, lalu ingat pilihannya. */
function toggleDarkMode() {
  const jadiGelap = !document.documentElement.classList.contains('dark');
  terapkanTema(jadiGelap);
  simpanTema(jadiGelap ? 'dark' : 'light');
}

function inisialisasiTema() {
  if (bacaTemaTersimpan() === 'dark') terapkanTema(true);
}

/* ---------- 8. Lightbox logo ---------- */

/** Klik ikon logo kecil: tampilkan logo besar. Klik tidak diteruskan ke link pembungkusnya. */
function bukaLogoBesar(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  tampilkan(ambil('modal-logo-besar'));
}

function tutupLogoBesar() {
  sembunyikan(ambil('modal-logo-besar'));
}

/* ---------- 9. Animasi scroll + inisialisasi ---------- */

/** Elemen berkelas .reveal muncul pelan-pelan saat masuk layar. Tiap elemen hanya diamati sampai muncul. */
function inisialisasiAnimasiScroll() {
  const daftar = document.querySelectorAll('.reveal');

  // Browser lama tanpa IntersectionObserver: tampilkan semuanya langsung (jangan sampai konten tersembunyi)
  if (!('IntersectionObserver' in window)) {
    daftar.forEach(function (el) { el.classList.add('visible'); });
    return;
  }

  const pengamat = new IntersectionObserver(function (entri) {
    entri.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        pengamat.unobserve(e.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

  daftar.forEach(function (el) { pengamat.observe(el); });
}

/** Jalankan satu langkah inisialisasi; kalau gagal, langkah lain tetap lanjut (halaman tidak mati total). */
function jalankanDenganAman(namaLangkah, fungsi) {
  try {
    fungsi();
  } catch (galat) {
    console.error('Gagal menjalankan "' + namaLangkah + '":', galat);
  }
}

function inisialisasi() {
  jalankanDenganAman('tema', inisialisasiTema);
  jalankanDenganAman('menu mobile beranda', function () { inisialisasiMenuMobile('menuBtn', 'mobileMenu', 'bar1', 'bar2'); });
  jalankanDenganAman('menu mobile donasi', function () { inisialisasiMenuMobile('menuBtn2', 'mobileMenu2', 'bar1b', 'bar2b'); });
  jalankanDenganAman('menu mobile kegiatan', function () { inisialisasiMenuMobile('menuBtn3', 'mobileMenu3', 'bar1c', 'bar2c'); });
  jalankanDenganAman('menu mobile legalitas', function () { inisialisasiMenuMobile('menuBtn4', 'mobileMenu4', 'bar1d', 'bar2d'); });
  jalankanDenganAman('animasi scroll', inisialisasiAnimasiScroll);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', inisialisasi);
} else {
  inisialisasi();
}
