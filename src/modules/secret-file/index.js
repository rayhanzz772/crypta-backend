const router = require('express').Router()
const multer = require('multer')

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

const upload = multer({
	storage: multer.memoryStorage(),
	limits: {
		fileSize: 20 * 1024 * 1024 // 20 MB
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
