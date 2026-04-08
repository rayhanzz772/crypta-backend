const path = require('path')
const cuid = require('cuid')
const archiver = require('archiver')
const { HttpStatusCode } = require('axios')
const db = require('../../../db/models')

const api = require('../../utils/api')
const {
	uploadEncryptedFile,
	getEncryptedFile,
	deleteEncryptedFile,
	decryptBufferAES256GCM,
	resolveEncryptionKey
} = require('../../utils/minio')

const CREATED = HttpStatusCode.Created || 201
const BAD_REQUEST = HttpStatusCode.BadRequest || 400
const INTERNAL_SERVER_ERROR = HttpStatusCode.InternalServerError || 500
const NOT_FOUND = HttpStatusCode.NotFound || 404
const CONFLICT = HttpStatusCode.Conflict || 409

const File = db.File
const FileFolder = db.FileFolder

function sanitizeFilename(filename) {
	const ext = path.extname(filename || '')
	const name = path.basename(filename || 'file', ext)

	const safeName = name
		.replace(/[^a-zA-Z0-9-_]/g, '-')
		.replace(/-+/g, '-')
		.slice(0, 60)

	return `${safeName || 'file'}${ext || ''}`
}

function isStorageNotFoundError(err) {
	return (
		err?.code === 'NotFound' ||
		err?.code === 'NoSuchKey' ||
		err?.code === 'NoSuchBucket' ||
		err?.message === 'Not Found'
	)
}

class Controller {
	static async uploadSecretFile(req, res) {
		try {
			const userId = req.user?.userId
			const { folder_id, mek } = req.body

			if (!req.file) {
				return res.status(BAD_REQUEST).json({
					success: false,
					message: 'file is required (multipart/form-data field name: file)'
				})
			}

			let folderName = 'root'
			let folderId = null

			if (folder_id) {
				const folder = await FileFolder.findOne({
					where: { id: folder_id, user_id: userId, deleted_at: null }
				})

				if (!folder) {
					return res.status(NOT_FOUND).json({
						success: false,
						message: 'Folder not found'
					})
				}

				folderName = folder.name
				folderId = folder.id
			}

			const cleanFilename = sanitizeFilename(req.file.originalname)
			const objectName = `${folderName}/${userId}/${Date.now()}-${cuid.slug()}-${cleanFilename}`

			const uploaded = await uploadEncryptedFile({
				objectName,
				fileBuffer: req.file.buffer,
				mimeType: req.file.mimetype,
				originalSize: req.file.size,
				mekHex: mek,
				userId
			})

			const fileRecord = await File.create({
				user_id: userId,
				folder_id: folderId,
				bucket: uploaded.bucketName,
				object_name: uploaded.objectName,
				original_filename: req.file.originalname,
				mime_type: req.file.mimetype,
				original_size: uploaded.originalSize,
				encrypted_size: uploaded.encryptedSize,
				encryption: uploaded.encryption,
				iv: uploaded.iv,
				tag: uploaded.tag
			})

			return res.status(CREATED).json(
				api.results(
					{
						id: fileRecord.id,
						folder_id: fileRecord.folder_id,
						folder_name: folderName,
						bucket: uploaded.bucketName,
						object_name: uploaded.objectName,
						encrypted_size: uploaded.encryptedSize,
						original_size: uploaded.originalSize,
						encryption: uploaded.encryption,
						iv: uploaded.iv,
						tag: uploaded.tag,
						original_filename: req.file.originalname,
						mime_type: req.file.mimetype
					},
					CREATED,
					{ req }
				)
			)
		} catch (err) {
			const isClientError =
				err.message.includes('Encryption key') ||
				err.message.includes('MEK') ||
				err.message.includes('MinIO is not configured')

			return res.status(isClientError ? BAD_REQUEST : INTERNAL_SERVER_ERROR).json({
				success: false,
				message: err.message
			})
		}
	}

	static async createFolder(req, res) {
		try {
			const userId = req.user.userId
			const name = req.body.name.trim()

			const existing = await FileFolder.findOne({
				where: { user_id: userId, name, deleted_at: null }
			})

			if (existing) {
				return res.status(CONFLICT).json({
					success: false,
					message: 'Folder with this name already exists'
				})
			}

			const folder = await FileFolder.create({
				user_id: userId,
				name
			})

			return res.status(CREATED).json(api.results(folder, CREATED, { req }))
		} catch (err) {
			return res.status(INTERNAL_SERVER_ERROR).json({
				success: false,
				message: err.message
			})
		}
	}

	static async getMyFolders(req, res) {
		try {
			const userId = req.user.userId

			const folders = await FileFolder.findAll({
				where: { user_id: userId, deleted_at: null },
				order: [['created_at', 'DESC']],
				attributes: ['id', 'name', 'created_at']
			})

			return res.status(200).json(api.results(folders, 200, { req }))
		} catch (err) {
			return res.status(INTERNAL_SERVER_ERROR).json({
				success: false,
				message: err.message
			})
		}
	}

	static async getFilesByFolder(req, res) {
		try {
			const userId = req.user.userId
			const { folder_id } = req.params

			const folder = await FileFolder.findOne({
				where: { id: folder_id, user_id: userId, deleted_at: null },
				attributes: ['id', 'name', 'created_at']
			})

			if (!folder) {
				return res.status(NOT_FOUND).json({
					success: false,
					message: 'Folder not found'
				})
			}

			const files = await File.findAll({
				where: { user_id: userId, folder_id, deleted_at: null },
				order: [['created_at', 'DESC']],
				attributes: [
					'id',
					'original_filename',
					'mime_type',
					'original_size',
					'encrypted_size',
					'encryption',
					'created_at'
				]
			})

			return res.status(200).json(
				api.results(
					{
						folder,
						files
					},
					200,
					{ req }
				)
			)
		} catch (err) {
			return res.status(INTERNAL_SERVER_ERROR).json({
				success: false,
				message: err.message
			})
		}
	}

	static async getMyFiles(req, res) {
		try {
			const userId = req.user.userId
			const limit = parseInt(req.query.per_page) || 10
			const page = parseInt(req.query.page) || 1
			const offset = (page - 1) * limit
			const q = req.query.q?.trim()

			const where = { user_id: userId, deleted_at: null }

			if (q) {
				where.original_filename = {
					[db.Sequelize.Op.iLike]: `%${q}%`
				}
			}

			const files = await File.findAndCountAll({
				where,
				order: [['created_at', 'DESC']],
				limit,
				offset,
				attributes: [
					'id',
					'original_filename',
					'mime_type',
					'original_size',
					'encrypted_size',
					'encryption',
					'created_at'
				]
			})

			return res.status(200).json(api.results(files, 200, { req }))
		} catch (err) {
			return res.status(INTERNAL_SERVER_ERROR).json({
				success: false,
				message: err.message
			})
		}
	}

	static async downloadSecretFileById(req, res) {
		try {
			const userId = req.user.userId
			const { id } = req.params
			const { mek } = req.body || {}

			const fileRecord = await File.findOne({
				where: {
					id,
					user_id: userId,
					deleted_at: null
				}
			})

			if (!fileRecord) {
				return res.status(NOT_FOUND).json({
					success: false,
					message: 'File not found'
				})
			}

			const file = await getEncryptedFile({
				bucketName: fileRecord.bucket,
				objectName: fileRecord.object_name
			})

			const key = resolveEncryptionKey(mek)
			const decryptedBuffer = decryptBufferAES256GCM(
				file.encryptedBuffer,
				key,
				fileRecord.iv,
				fileRecord.tag
			)

			res.setHeader('Content-Type', fileRecord.mime_type)
			res.setHeader(
				'Content-Disposition',
				`attachment; filename="${fileRecord.original_filename}"`
			)

			return res.status(200).send(decryptedBuffer)
		} catch (err) {
			const isClientError =
				err.message.includes('Encryption key') ||
				err.message.includes('MEK') ||
				err.message.includes('Unsupported state or unable to authenticate data')

			return res.status(isClientError ? BAD_REQUEST : INTERNAL_SERVER_ERROR).json({
				success: false,
				message: err.message
			})
		}
	}

	static async deleteFileById(req, res) {
		try {
			const userId = req.user.userId
			const { id } = req.params

			const fileRecord = await File.findOne({
				where: {
					id,
					user_id: userId,
					deleted_at: null
				}
			})

			if (!fileRecord) {
				return res.status(NOT_FOUND).json({
					success: false,
					message: 'File not found'
				})
			}

			await deleteEncryptedFile({
				bucketName: fileRecord.bucket,
				objectName: fileRecord.object_name
			})

			await fileRecord.destroy()

			return res.status(200).json({
				success: true,
				message: 'File deleted successfully'
			})
		} catch (err) {
			return res.status(INTERNAL_SERVER_ERROR).json({
				success: false,
				message: err.message
			})
		}
	}

	static async deleteFolderById(req, res) {
		const t = await db.sequelize.transaction()
		try {
			const userId = req.user.userId
			const { folder_id } = req.params

			const folder = await FileFolder.findOne({
				where: { id: folder_id, user_id: userId, deleted_at: null },
				transaction: t
			})

			if (!folder) {
				await t.rollback()
				return res.status(NOT_FOUND).json({
					success: false,
					message: 'Folder not found'
				})
			}

			const files = await File.findAll({
				where: { user_id: userId, folder_id, deleted_at: null },
				transaction: t
			})

			for (const file of files) {
				await deleteEncryptedFile({
					bucketName: file.bucket,
					objectName: file.object_name
				})
				await file.destroy({ transaction: t })
			}

			await folder.destroy({ transaction: t })
			await t.commit()

			return res.status(200).json({
				success: true,
				message: 'Folder deleted successfully',
				data: { deleted_files: files.length }
			})
		} catch (err) {
			await t.rollback()
			return res.status(INTERNAL_SERVER_ERROR).json({
				success: false,
				message: err.message
			})
		}
	}

	static async downloadFolderById(req, res) {
		try {
			const userId = req.user.userId
			const { folder_id } = req.params
			const { mek } = req.body || {}

			const folder = await FileFolder.findOne({
				where: { id: folder_id, user_id: userId, deleted_at: null }
			})

			if (!folder) {
				return res.status(NOT_FOUND).json({
					success: false,
					message: 'Folder not found'
				})
			}

			const files = await File.findAll({
				where: { user_id: userId, folder_id, deleted_at: null },
				order: [['created_at', 'ASC']]
			})

			if (!files.length) {
				return res.status(NOT_FOUND).json({
					success: false,
					message: 'No files in this folder to download'
				})
			}

			const key = resolveEncryptionKey(mek)

			const availableFiles = []
			const missingFiles = []

			for (const fileRecord of files) {
				try {
					const file = await getEncryptedFile({
						bucketName: fileRecord.bucket,
						objectName: fileRecord.object_name
					})

					const decryptedBuffer = decryptBufferAES256GCM(
						file.encryptedBuffer,
						key,
						fileRecord.iv,
						fileRecord.tag
					)

					availableFiles.push({
						name: fileRecord.original_filename,
						buffer: decryptedBuffer
					})
				} catch (error) {
					if (isStorageNotFoundError(error)) {
						missingFiles.push({
							id: fileRecord.id,
							original_filename: fileRecord.original_filename,
							object_name: fileRecord.object_name,
							bucket: fileRecord.bucket
						})
						continue
					}
					throw error
				}
			}

			if (availableFiles.length === 0) {
				return res.status(NOT_FOUND).json({
					success: false,
					message: 'All files in this folder are missing from storage',
					data: { missing_files: missingFiles }
				})
			}

			res.setHeader('Content-Type', 'application/zip')
			res.setHeader(
				'Content-Disposition',
				`attachment; filename="${folder.name}.zip"`
			)
			res.setHeader('X-Missing-Files', String(missingFiles.length))

			const archive = archiver('zip', { zlib: { level: 9 } })
			archive.on('error', (error) => {
				if (!res.headersSent) {
					res.status(INTERNAL_SERVER_ERROR).json({
						success: false,
						message: error.message
					})
				}
			})

			archive.pipe(res)

			for (const item of availableFiles) {
				archive.append(item.buffer, { name: item.name })
			}

			if (missingFiles.length > 0) {
				archive.append(JSON.stringify({ missing_files: missingFiles }, null, 2), {
					name: 'missing-files.json'
				})
			}

			await archive.finalize()
		} catch (err) {
			const isClientError =
				err.message.includes('Encryption key') ||
				err.message.includes('MEK') ||
				err.message.includes('Unsupported state or unable to authenticate data') ||
				isStorageNotFoundError(err)

			if (!res.headersSent) {
				return res.status(isStorageNotFoundError(err) ? NOT_FOUND : isClientError ? BAD_REQUEST : INTERNAL_SERVER_ERROR).json({
					success: false,
					message: err.message
				})
			}
		}
	}

	static async downloadSecretFile(req, res) {
			try {
				const { bucket, object_name, mek } = req.body

				const file = await getEncryptedFile({
					bucketName: bucket,
					objectName: object_name
				})

				if (!file.iv || !file.tag) {
					return res.status(BAD_REQUEST).json({
						success: false,
						message: 'Missing encryption metadata (iv/tag) on object'
					})
				}

				const key = resolveEncryptionKey(mek)
				const decryptedBuffer = decryptBufferAES256GCM(
					file.encryptedBuffer,
					key,
					file.iv,
					file.tag
				)

				const filename = path.basename(object_name)

				res.setHeader('Content-Type', file.originalMimeType)
				res.setHeader(
					'Content-Disposition',
					`attachment; filename="${filename}"`
				)

				return res.status(200).send(decryptedBuffer)
			} catch (err) {
				const isClientError =
					err.message.includes('Encryption key') ||
					err.message.includes('MEK') ||
					err.message.includes('Unsupported state or unable to authenticate data')

				return res.status(isClientError ? BAD_REQUEST : INTERNAL_SERVER_ERROR).json({
					success: false,
					message: err.message
				})
			}
	}
}

module.exports = Controller
