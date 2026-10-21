// Konfigurasi Tailwind: warna brand & gold, bayangan, animasi.
// File ini HARUS dimuat setelah script CDN Tailwind (urutannya diatur di index.html).
if (window.tailwind) {
  tailwind.config = {
    theme: {
      extend: {
        colors: {
          brand: {
            25: "#F5F9F3", 50: "#EEF5EB", 100: "#DCEBD6", 200: "#B9D7AF",
            300: "#8FBE81", 400: "#5FA152", 500: "#3B8A3E", 600: "#2C6E35",
            700: "#1F572C", 800: "#153F21", 900: "#0D2A17", 950: "#081C0F",
          },
          gold: {
            50: "#FBF3DE", 100: "#F5E4B0", 300: "#EAC968", 400: "#DEB33F",
            500: "#D4A017", 600: "#B3860F", 700: "#8C6A0C",
          },
        },
        boxShadow: {
          soft: "0 20px 45px -15px rgba(13, 42, 23, 0.25)",
          card: "0 10px 30px -10px rgba(13, 42, 23, 0.15)",
        },
        animation: { floaty: "floaty 5s ease-in-out infinite" },
        keyframes: {
          floaty: { "0%,100%": { transform: "translateY(0px)" }, "50%": { transform: "translateY(-10px)" } },
        },
      },
    },
  };
} else {
  // CDN Tailwind gagal dimuat (biasanya karena tidak ada koneksi internet).
  console.warn('Tailwind CDN tidak termuat. Tampilan tidak akan ter-style sampai koneksi pulih.');
}
