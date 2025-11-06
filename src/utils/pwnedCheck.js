import fetch from "node-fetch";
import sha1 from "sha1";

/**
 * Mengecek apakah password pernah bocor menggunakan HIBP API.
 * @param {string} password - password plaintext
 * @returns {Promise<number>} jumlah kali password ditemukan (0 = aman)
 */
export async function checkPasswordBreach(password) {
  // Hash password pakai SHA1 (uppercase, sesuai format HIBP)
  const hash = sha1(password).toUpperCase();
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);

  // Request ke API Have I Been Pwned (no auth, public)
  const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
  if (!res.ok) {
    throw new Error(`HIBP request failed: ${res.status}`);
  }

  const body = await res.text();
  // Cek apakah suffix hash ada di daftar
  const lines = body.split("\n");
  for (const line of lines) {
    const [foundSuffix, count] = line.trim().split(":");
    if (foundSuffix === suffix) {
      return parseInt(count, 10);
    }
  }
  return 0; // aman
}
