const { z } = require('zod')

const uploadSecretFileSchema = z.object({
	folder_id: z.string().optional(),
	mek: z
		.string()
		.regex(/^[a-fA-F0-9]{64}$/, 'MEK must be 64 hex characters')
		.optional()
})

const downloadSecretFileSchema = z.object({
	bucket: z.string().min(1, 'bucket is required'),
	object_name: z.string().min(1, 'object_name is required'),
	mek: z
		.string()
		.regex(/^[a-fA-F0-9]{64}$/, 'MEK must be 64 hex characters')
		.optional()
})

const listFilesQuerySchema = z.object({
	per_page: z.coerce.number().min(1).max(100).optional().default(10),
	page: z.coerce.number().min(1).optional().default(1),
	q: z.string().max(100).optional()
})

const idParamSchema = z.object({
	id: z.string().min(1, 'id is required')
})

const createFolderSchema = z.object({
	name: z
		.string({ required_error: 'Folder name is required' })
		.trim()
		.min(1, 'Folder name cannot be empty')
		.max(100, 'Folder name is too long')
})

const folderIdParamSchema = z.object({
	folder_id: z.string().min(1, 'folder_id is required')
})

const downloadByIdBodySchema = z.object({
	mek: z
		.string()
		.regex(/^[a-fA-F0-9]{64}$/, 'MEK must be 64 hex characters')
		.optional()
})

const downloadFolderBodySchema = z.object({
	mek: z
		.string()
		.regex(/^[a-fA-F0-9]{64}$/, 'MEK must be 64 hex characters')
		.optional()
})

module.exports = {
	uploadSecretFileSchema,
	downloadSecretFileSchema,
	listFilesQuerySchema,
	idParamSchema,
	downloadByIdBodySchema,
	downloadFolderBodySchema,
	createFolderSchema,
	folderIdParamSchema
}
