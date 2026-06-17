const router = require('express').Router()
const multer = require('multer')
const path = require('path')

const Controller = require('./controller')
const validateRequest = require('../../middleware/validateRequest')
const {
	uploadSecretFileSchema,
	downloadSecretFileSchema,
	listFilesQuerySchema,
	idParamSchema,
	downloadByIdBodySchema,
	downloadFolderBodySchema,
	createFolderSchema,
	folderIdParamSchema
} = require('./schema')

/**
 * Whitelist of allowed MIME types for upload.
 * Prevents execution of server-side code (e.g., .php, .js, .exe).
 */
const ALLOWED_MIME_TYPES = new Set([
	// Images
	'image/jpeg',
	'image/png',
	'image/gif',
	'image/webp',
	'image/svg+xml',
	'image/bmp',
	'image/tiff',
	'image/avif',

	// Documents
	'application/pdf',
	'application/msword',
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	'application/vnd.ms-excel',
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	'application/vnd.ms-powerpoint',
	'application/vnd.openxmlformats-officedocument.presentationml.presentation',

	// Archives
	'application/zip',
	'application/x-rar-compressed',
	'application/x-7z-compressed',
	'application/x-tar',
	'application/gzip',

	// Text / Config
	'text/plain',
	'text/csv',
	'application/json',
	'application/xml',
	'application/x-yaml',
	'text/yaml',

	// Certificates / Keys
	'application/x-pem-file',
	'application/x-x509-ca-cert',

	// Generic binary
	'application/octet-stream'
])

const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20 MB

const upload = multer({
	storage: multer.memoryStorage(),
	limits: {
		fileSize: MAX_FILE_SIZE,
		files: 1 // only allow single file upload
	},
	fileFilter: (req, file, cb) => {
		// Check MIME type
		if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
			return cb(
				new Error(`File type "${file.mimetype}" is not allowed. Allowed types: images, documents, archives, text, certificates.`),
				false
			)
		}

		// Check dangerous extensions that could bypass MIME checks
		const ext = path.extname(file.originalname || '').toLowerCase()
		const BLOCKED_EXTENSIONS = new Set([
			'.exe', '.bat', '.cmd', '.com', '.cpl', '.scr', '.pif', '.msi',
			'.php', '.phtml', '.asp', '.aspx', '.jsp', '.cgi', '.pl',
			'.js', '.mjs', '.cjs', '.ts', '.sh', '.bash', '.ps1',
			'.dll', '.so', '.dylib', '.vbs', '.wsf', '.hta'
		])
		if (BLOCKED_EXTENSIONS.has(ext)) {
			return cb(
				new Error(`File extension "${ext}" is not allowed for security reasons.`),
				false
			)
		}

		cb(null, true)
	}
})

function handleMulterError(err, req, res, next) {
	if (!err) return next()

	if (err instanceof multer.MulterError) {
		return res.status(400).json({
			success: false,
			message:
				err.code === 'LIMIT_FILE_SIZE'
					? 'File too large. Max size is 20 MB.'
					: err.message
		})
	}

	return res.status(400).json({
		success: false,
		message: err.message || 'Upload failed'
	})
}

router.post(
	'/upload',
	upload.any(),
	(req, res, next) => {
		if (!req.file && Array.isArray(req.files) && req.files.length > 0) {
			req.file = req.files[0]
		}
		next()
	},
	validateRequest({ body: uploadSecretFileSchema }),
	Controller.uploadSecretFile,
	handleMulterError
)

router.post(
	'/download',
	validateRequest({ body: downloadSecretFileSchema }),
	Controller.downloadSecretFile
)

router.get(
	'/',
	validateRequest({ query: listFilesQuerySchema }),
	Controller.getMyFiles
)

router.post(
	'/folders',
	validateRequest({ body: createFolderSchema }),
	Controller.createFolder
)

router.get('/folders', Controller.getMyFolders)

router.get(
	'/folders/:folder_id/files',
	validateRequest({ params: folderIdParamSchema }),
	Controller.getFilesByFolder
)

router.delete(
	'/folders/:folder_id/delete',
	validateRequest({ params: folderIdParamSchema }),
	Controller.deleteFolderById
)

router.post(
	'/folders/:folder_id/download',
	validateRequest({ params: folderIdParamSchema, body: downloadFolderBodySchema }),
	Controller.downloadFolderById
)

router.post(
	'/:id/download',
	validateRequest({ params: idParamSchema, body: downloadByIdBodySchema }),
	Controller.downloadSecretFileById
)

router.delete(
	'/:id/delete',
	validateRequest({ params: idParamSchema }),
	Controller.deleteFileById
)

module.exports = router
