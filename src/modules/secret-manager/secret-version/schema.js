const { z } = require('zod')

module.exports = z.object({
  plaintext: z
    .string()
    .min(1, 'Secret tidak boleh kosong')
    .max(8192, 'Secret terlalu panjang')
})
