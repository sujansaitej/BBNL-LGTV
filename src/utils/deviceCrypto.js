/**
 * deviceCrypto.js — RSA keypair lifecycle for BBNL device authentication
 * (spec rows 33 `/getdeviceid` and 34 `/devAuth`).
 *
 * ─── Algorithm choice ──────────────────────────────────────────────────────
 * RSASSA-PKCS1-v1_5 with SHA-256, modulus length 2048, public exponent 65537.
 *
 * Why PKCS1-v1_5 (and not RSA-PSS)? The BBNL spec only states "verify
 * signature" with no MGF/salt-length parameters. PKCS1-v1_5 is the
 * deterministic, parameter-free RSA signature scheme that virtually every
 * server-side stack (OpenSSL, BouncyCastle, Java Security, .NET RSA, Python
 * `cryptography`) supports out of the box. RSA-PSS is preferred from a
 * cryptography standpoint but requires the verifier to agree on hash + MGF +
 * salt length; without spec confirmation we default to the safer-to-interop
 * choice. If the backend confirms RSA-PSS, change `RSA_ALGORITHM_NAME` and
 * the `keyGen`/`sign` parameter blocks below — the rest of the file is
 * algorithm-agnostic.
 *
 * ─── Signing semantics ─────────────────────────────────────────────────────
 * `signPayload(payloadString)` signs the literal UTF-8 bytes of the input
 * string with NO canonicalization, NO normalization, NO trimming, NO JSON
 * re-serialization. The caller is responsible for producing the exact same
 * byte sequence the server expects to verify. The output is the RSA signature
 * encoded as standard base64 (no URL-safe variant, no line wrapping).
 *
 * ─── Backend coordination required ─────────────────────────────────────────
 * Spec row 34 says `hash` is the signature but does NOT specify what string
 * the client must sign. We currently default to the synthetic string
 *     `${userid}|${devid}|${Date.now()}`
 * in DeviceAuthApi.jsx. Before wiring this into the auth pipeline, the BBNL
 * server team must confirm:
 *   (a) the exact payload format to sign (likely a server-issued nonce
 *       returned from a separate "challenge" call, but this is missing from
 *       the spec sheet);
 *   (b) the signature algorithm (PKCS1-v1_5 vs PSS) and digest;
 *   (c) the encoding of the signature in transit (base64 std vs base64url).
 *
 * ─── Persistence ───────────────────────────────────────────────────────────
 * The CryptoKeyPair is stored in IndexedDB:
 *     DB:    bbnl_device_keys   (version 1)
 *     Store: keypairs           (out-of-line, key supplied on put)
 *     Key:   "default"
 * IndexedDB serializes CryptoKey handles via the structured-clone algorithm,
 * which preserves the `extractable` flag. The private key is generated with
 * `extractable: false` so it can never be exported to bytes — only used as a
 * signing handle. The public key is generated extractable so we can export
 * SPKI bytes for `pubkey` registration.
 */

const DB_NAME = "bbnl_device_keys";
const DB_VERSION = 1;
const STORE_NAME = "keypairs";
const RECORD_KEY = "default";

const RSA_ALGORITHM_NAME = "RSASSA-PKCS1-v1_5";
const RSA_HASH = "SHA-256";
const RSA_MODULUS_LENGTH = 2048;
// 65537 in big-endian bytes — the standard RSA public exponent.
const RSA_PUBLIC_EXPONENT = new Uint8Array([0x01, 0x00, 0x01]);

// ── ArrayBuffer ↔ base64 helpers ────────────────────────────────────────────
const arrayBufferToBase64 = (buf) => {
  const bytes = new Uint8Array(buf);
  let binary = "";
  // Chunk to avoid argument-count limits on String.fromCharCode for large buffers.
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(
      null,
      bytes.subarray(i, i + CHUNK)
    );
  }
  return btoa(binary);
};

// ── Subtle-crypto availability guard ────────────────────────────────────────
const getSubtle = () => {
  const subtle =
    (typeof window !== "undefined" && window.crypto && window.crypto.subtle) || null;
  if (!subtle) {
    throw new Error("crypto.subtle is not available in this runtime");
  }
  return subtle;
};

// ── Thin IndexedDB wrapper ──────────────────────────────────────────────────
const openDB = () =>
  new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available in this runtime"));
      return;
    }
    let req;
    try {
      req = indexedDB.open(DB_NAME, DB_VERSION);
    } catch (err) {
      reject(err);
      return;
    }
    req.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("IndexedDB open failed"));
    req.onblocked = () =>
      reject(new Error("IndexedDB open blocked by another connection"));
  });

const idbGet = (db, key) =>
  new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error("IndexedDB get failed"));
    } catch (err) {
      reject(err);
    }
  });

const idbPut = (db, key, value) =>
  new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(value, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error || new Error("IndexedDB put failed"));
    } catch (err) {
      reject(err);
    }
  });

const idbDelete = (db, key) =>
  new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () =>
        reject(req.error || new Error("IndexedDB delete failed"));
    } catch (err) {
      reject(err);
    }
  });

// ── Keypair generation ──────────────────────────────────────────────────────
const generateKeypair = async () => {
  const subtle = getSubtle();
  // Generate as extractable: true so we can split the pair, then re-import the
  // private key as non-extractable below. (You cannot directly produce a
  // CryptoKeyPair where only one half is extractable from generateKey alone
  // when keyUsages are split, but RSASSA can — we still re-import to enforce.)
  const pair = await subtle.generateKey(
    {
      name: RSA_ALGORITHM_NAME,
      modulusLength: RSA_MODULUS_LENGTH,
      publicExponent: RSA_PUBLIC_EXPONENT,
      hash: { name: RSA_HASH },
    },
    true,
    ["sign", "verify"]
  );

  // Re-import the private key with extractable=false to enforce the security
  // invariant: from this point on the private key bytes can never be exported.
  const pkcs8 = await subtle.exportKey("pkcs8", pair.privateKey);
  const nonExtractablePrivate = await subtle.importKey(
    "pkcs8",
    pkcs8,
    {
      name: RSA_ALGORITHM_NAME,
      hash: { name: RSA_HASH },
    },
    false, // extractable: false  ← enforced here
    ["sign"]
  );

  // Best-effort scrub of the temporary plaintext private key buffer.
  try {
    new Uint8Array(pkcs8).fill(0);
  } catch {
    /* ignore */
  }

  // Re-import the public key as extractable=true with only ["verify"] usage.
  const spki = await subtle.exportKey("spki", pair.publicKey);
  const publicKey = await subtle.importKey(
    "spki",
    spki,
    {
      name: RSA_ALGORITHM_NAME,
      hash: { name: RSA_HASH },
    },
    true,
    ["verify"]
  );

  return { publicKey, privateKey: nonExtractablePrivate };
};

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Returns the persisted keypair, generating + storing one if none exists.
 * @returns {Promise<{publicKeyBase64: string, privateKeyHandle: CryptoKey}>}
 */
export const getOrCreateDeviceKeypair = async () => {
  try {
    const subtle = getSubtle();
    const db = await openDB();

    let record = await idbGet(db, RECORD_KEY);

    if (
      !record ||
      !record.publicKey ||
      !record.privateKey ||
      typeof record.publicKey !== "object"
    ) {
      const pair = await generateKeypair();
      record = {
        publicKey: pair.publicKey,
        privateKey: pair.privateKey,
        createdAt: Date.now(),
        algorithm: RSA_ALGORITHM_NAME,
        hash: RSA_HASH,
        modulusLength: RSA_MODULUS_LENGTH,
      };
      await idbPut(db, RECORD_KEY, record);
    }

    const spki = await subtle.exportKey("spki", record.publicKey);
    const publicKeyBase64 = arrayBufferToBase64(spki);

    return {
      publicKeyBase64,
      privateKeyHandle: record.privateKey,
    };
  } catch (err) {
    return Promise.reject(
      err instanceof Error ? err : new Error(String(err))
    );
  }
};

/**
 * Sign a UTF-8 string with the persisted private key. Throws if no keypair
 * exists in IndexedDB (call `getOrCreateDeviceKeypair` first or use
 * `exportPublicKeyBase64` which auto-generates).
 * @param {string} payloadString
 * @returns {Promise<string>} base64-encoded RSA signature
 */
export const signPayload = async (payloadString) => {
  try {
    if (typeof payloadString !== "string") {
      throw new Error("signPayload requires a string payload");
    }
    const subtle = getSubtle();
    const db = await openDB();
    const record = await idbGet(db, RECORD_KEY);
    if (!record || !record.privateKey) {
      throw new Error("No device keypair");
    }
    const data = new TextEncoder().encode(payloadString);
    const sig = await subtle.sign(
      { name: RSA_ALGORITHM_NAME },
      record.privateKey,
      data
    );
    return arrayBufferToBase64(sig);
  } catch (err) {
    return Promise.reject(
      err instanceof Error ? err : new Error(String(err))
    );
  }
};

/**
 * Returns the SPKI base64 of the persisted (or freshly generated) public key.
 * Auto-generates the keypair if none exists.
 * @returns {Promise<string>}
 */
export const exportPublicKeyBase64 = async () => {
  try {
    const { publicKeyBase64 } = await getOrCreateDeviceKeypair();
    return publicKeyBase64;
  } catch (err) {
    return Promise.reject(
      err instanceof Error ? err : new Error(String(err))
    );
  }
};

/**
 * Deletes the persisted keypair record. The next call to
 * `getOrCreateDeviceKeypair` / `exportPublicKeyBase64` will generate a fresh
 * keypair. For testing / debug only — production callers should NOT invoke
 * this casually because it invalidates the device's registered public key on
 * the BBNL backend.
 * @returns {Promise<void>}
 */
export const resetDeviceKeypair = async () => {
  try {
    const db = await openDB();
    await idbDelete(db, RECORD_KEY);
  } catch (err) {
    return Promise.reject(
      err instanceof Error ? err : new Error(String(err))
    );
  }
};
