require('dotenv').config()

const crypto = require('crypto')
const Minio = require('minio')

const AES_ALGORITHM = 'aes-256-gcm'
const AES_KEY_LENGTH = 32
const AES_IV_LENGTH = 12

function getMinioClient() {
	const {
		MINIO_ENDPOINT,
		MINIO_PORT,
		MINIO_USE_SSL,
		MINIO_ACCESS_KEY,
		MINIO_SECRET_KEY
	} = process.env

	if (!MINIO_ENDPOINT || !MINIO_ACCESS_KEY || !MINIO_SECRET_KEY) {
		throw new Error(
			'MinIO is not configured. Set MINIO_ENDPOINT, MINIO_ACCESS_KEY, and MINIO_SECRET_KEY.'
		)
	}

	return new Minio.Client({
		endPoint: MINIO_ENDPOINT,
		port: MINIO_PORT ? Number(MINIO_PORT) : 9000,
		useSSL: String(MINIO_USE_SSL).toLowerCase() === 'true',
		accessKey: MINIO_ACCESS_KEY,
		secretKey: MINIO_SECRET_KEY
	})
}

function resolveEncryptionKey(mekHex) {
	if (mekHex && typeof mekHex === 'string') {
		const mek = Buffer.from(mekHex, 'hex')
		if (mek.length !== AES_KEY_LENGTH) {
			throw new Error('MEK must be a 32-byte key encoded as 64 hex characters')
		}
		return mek
	}

	const envKey = process.env.FILE_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY
	if (!envKey) {
		throw new Error(
			'Encryption key missing. Provide body.mek (64 hex) or set FILE_ENCRYPTION_KEY (64 hex).'
		)
	}

	const key = Buffer.from(envKey, 'hex')
	if (key.length !== AES_KEY_LENGTH) {
		throw new Error('FILE_ENCRYPTION_KEY must be 64 hex characters')
	}

	return key
}

function encryptBufferAES256GCM(buffer, key) {
	const iv = crypto.randomBytes(AES_IV_LENGTH)
	const cipher = crypto.createCipheriv(AES_ALGORITHM, key, iv)

	const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()])
	const tag = cipher.getAuthTag()

	return { encrypted, iv, tag }
}

function decryptBufferAES256GCM(buffer, key, ivHex, tagHex) {
	const iv = Buffer.from(ivHex, 'hex')
	const tag = Buffer.from(tagHex, 'hex')
	const decipher = crypto.createDecipheriv(AES_ALGORITHM, key, iv)
	decipher.setAuthTag(tag)

	return Buffer.concat([decipher.update(buffer), decipher.final()])
}

function streamToBuffer(stream) {
	return new Promise((resolve, reject) => {
		const chunks = []
		stream.on('data', (chunk) => chunks.push(chunk))
		stream.on('error', reject)
		stream.on('end', () => resolve(Buffer.concat(chunks)))
	})
}

async function ensureBucketExists(client, bucketName) {
	const bucketExists = await client.bucketExists(bucketName)
	if (!bucketExists) {
		await client.makeBucket(bucketName)
	}
}

async function uploadEncryptedFile({
	objectName,
	fileBuffer,
	mimeType,
	originalSize,
	mekHex,
	userId
}) {
	const client = getMinioClient()
	const bucketName = process.env.MINIO_BUCKET || 'crypta-files'

	await ensureBucketExists(client, bucketName)

	const encryptionKey = resolveEncryptionKey(mekHex)
	const { encrypted, iv, tag } = encryptBufferAES256GCM(fileBuffer, encryptionKey)

	const metaData = {
		'Content-Type': 'application/octet-stream',
		'X-Amz-Meta-Encryption': 'AES-256-GCM',
		'X-Amz-Meta-Original-Mimetype': mimeType || 'application/octet-stream',
		'X-Amz-Meta-Original-Size': String(originalSize || fileBuffer.length),
		'X-Amz-Meta-Iv': iv.toString('hex'),
		'X-Amz-Meta-Tag': tag.toString('hex')
	}

	if (userId) {
		metaData['X-Amz-Meta-User-Id'] = String(userId)
	}

	await client.putObject(bucketName, objectName, encrypted, encrypted.length, metaData)

	return {
		bucketName,
		objectName,
		encryption: 'AES-256-GCM',
		encryptedSize: encrypted.length,
		originalSize: originalSize || fileBuffer.length,
		iv: iv.toString('hex'),
		tag: tag.toString('hex')
	}
}

async function getEncryptedFile({ bucketName, objectName }) {
	const client = getMinioClient()
	const stat = await client.statObject(bucketName, objectName)
	const encryptedStream = await client.getObject(bucketName, objectName)
	const encryptedBuffer = await streamToBuffer(encryptedStream)

	const meta = stat.metaData || {}

	return {
		encryptedBuffer,
		iv: meta['x-amz-meta-iv'],
		tag: meta['x-amz-meta-tag'],
		originalMimeType:
			meta['x-amz-meta-original-mimetype'] || 'application/octet-stream',
		originalSize: Number(meta['x-amz-meta-original-size'] || encryptedBuffer.length)
	}
}

async function deleteEncryptedFile({ bucketName, objectName }) {
	const client = getMinioClient()
	await client.removeObject(bucketName, objectName)
	return { success: true }
}

module.exports = {
	uploadEncryptedFile,
	encryptBufferAES256GCM,
	decryptBufferAES256GCM,
	getEncryptedFile,
	deleteEncryptedFile,
	resolveEncryptionKey
}
