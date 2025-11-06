const crypto = require("crypto");
const argon2 = require("argon2");

const ALGORITHM = "aes-256-cbc";

async function deriveKey(masterPassword, salt, params = {}) {
  const defaultParams = {
    type: argon2.argon2id,
    memoryCost: params.memoryCost || 2 ** 16,
    timeCost: params.timeCost || 3,
    parallelism: params.parallelism || 1,
    hashLength: 32,
    raw: true,
  };

  const hash = await argon2.hash(masterPassword, {
    ...defaultParams,
    salt: Buffer.from(salt, "hex"),
  });

  return crypto.createHash("sha256").update(hash).digest();
}

exports.encrypt = async (plainText, masterPassword, params = {}) => {
  const iv = crypto.randomBytes(16);
  const salt = crypto.randomBytes(16).toString("hex");
  const key = await deriveKey(masterPassword, salt, params);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");

  return { salt, data: iv.toString("hex") + ":" + encrypted };
};

exports.decrypt = async (encryptedText, masterPassword, salt, params = {}) => {
  const [ivHex, encrypted] = encryptedText.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const key = await deriveKey(masterPassword, salt, params);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
};
