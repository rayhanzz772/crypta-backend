# Secret File API Documentation (Frontend Guide)

Dokumentasi ini untuk integrasi Frontend ke fitur file terenkripsi (AES-256-GCM) dengan MinIO.

## Base Info

- Base URL: `http://localhost:5000`
- Base path private API: `/api/files`
- Auth: wajib `Bearer Token` pada semua endpoint di dokumen ini.
- Semua endpoint di bawah diasumsikan dipanggil dengan header:
  - `Authorization: Bearer <JWT_TOKEN>`

## Encryption Notes

- File disimpan ke MinIO dalam kondisi terenkripsi `AES-256-GCM`.
- Untuk proses encrypt/decrypt, backend menggunakan:
  - `mek` dari request (opsional, 64 hex chars), atau
  - env server `FILE_ENCRYPTION_KEY`.
- Jika FE pakai `mek`, kirim di body sesuai endpoint yang mendukung.

## User Flow (Sesuai Kebutuhan FE)

1. Create Folder
2. List Folder
3. Open Folder (lihat isi file)
4. Upload File ke folder
5. Download file/folder
6. Delete file/folder

---

## 1) Create Folder

**POST** `/api/files/folders`

### Body (JSON)

```json
{
  "name": "My Documents"
}
```

### Success Response (201)

```json
{
  "success": true,
  "message": "success",
  "metadata": {},
  "data": {
    "id": "cmmm...",
    "user_id": "cmmm...",
    "name": "My Documents",
    "created_at": "2026-04-08T...",
    "updated_at": "2026-04-08T..."
  }
}
```

### Error Cases

- `409`: nama folder sudah ada untuk user yang sama
- `422`: validasi gagal

---

## 2) List Folders

**GET** `/api/files/folders`

### Success Response (200)

```json
{
  "success": true,
  "message": "success",
  "metadata": {},
  "data": [
    {
      "id": "cmmm...",
      "name": "My Documents",
      "created_at": "2026-04-08T..."
    }
  ]
}
```

---

## 3) Open Folder (List Files in Folder)

**GET** `/api/files/folders/:folder_id/files`

Contoh:

`GET /api/files/folders/cmmmFolderId123/files`

### Success Response (200)

```json
{
  "success": true,
  "message": "success",
  "metadata": {},
  "data": {
    "folder": {
      "id": "cmmmFolderId123",
      "name": "My Documents",
      "created_at": "2026-04-08T..."
    },
    "files": [
      {
        "id": "cmmmFileId123",
        "original_filename": "invoice.pdf",
        "mime_type": "application/pdf",
        "original_size": 15231,
        "encrypted_size": 15247,
        "encryption": "AES-256-GCM",
        "created_at": "2026-04-08T..."
      }
    ]
  }
}
```

### Error Cases

- `404`: folder tidak ditemukan / bukan milik user

---

## 4) Upload File

**POST** `/api/files/upload`

- Content-Type: `multipart/form-data`
- Backend menerima file dari field apa pun (`file`, `upload`, dll), dan akan pakai file pertama yang ditemukan.

### Form Data

- `file` (File) -> file yang diupload
- `folder_id` (Text, optional) -> id folder tujuan
- `mek` (Text, optional) -> 64 hex chars

Contoh `mek`:

`a3f5c1d9e7b24c5f81a0d3b6c9e2f4a1b7c8d9e0f1a2b3c4d5e6f708192a3b4c`

### Success Response (201)

```json
{
  "success": true,
  "message": "success",
  "metadata": {},
  "data": {
    "id": "cmmmFileId123",
    "folder_id": "cmmmFolderId123",
    "folder_name": "My Documents",
    "bucket": "crypta-files",
    "object_name": "My Documents/cmmmUserId/1775655170532-abc123-invoice.pdf",
    "encrypted_size": 15247,
    "original_size": 15231,
    "encryption": "AES-256-GCM",
    "iv": "f1c2d3...",
    "tag": "aabbcc...",
    "original_filename": "invoice.pdf",
    "mime_type": "application/pdf"
  }
}
```

### Error Cases

- `400`: file kosong / invalid key / MinIO config issue
- `404`: folder_id tidak valid

---

## 5) List All My Files (Global)

**GET** `/api/files?page=1&per_page=10&q=invoice`

Query:

- `page` optional (default 1)
- `per_page` optional (default 10, max 100)
- `q` optional (search by filename)

### Success Response (200)

```json
{
  "success": true,
  "message": "success",
  "metadata": {
    "per_page": 10,
    "current_page": 1,
    "total_row": 1,
    "total_page": 1
  },
  "data": [
    {
      "id": "cmmmFileId123",
      "original_filename": "invoice.pdf",
      "mime_type": "application/pdf",
      "original_size": 15231,
      "encrypted_size": 15247,
      "encryption": "AES-256-GCM",
      "created_at": "2026-04-08T..."
    }
  ]
}
```

---

## 6) Download Single File By ID

**POST** `/api/files/:id/download`

### Body (JSON)

```json
{
  "mek": "a3f5c1d9e7b24c5f81a0d3b6c9e2f4a1b7c8d9e0f1a2b3c4d5e6f708192a3b4c"
}
```

`mek` optional jika server sudah punya `FILE_ENCRYPTION_KEY`.

### Response

- Success: binary file (stream)
- Header `Content-Disposition` sudah diset untuk nama file asli.

### Error Cases

- `404`: file tidak ditemukan / bukan milik user
- `400`: decryption key invalid atau auth tag gagal

---

## 7) Download Folder (ZIP)

**POST** `/api/files/folders/:folder_id/download`

### Body (JSON)

```json
{
  "mek": "a3f5c1d9e7b24c5f81a0d3b6c9e2f4a1b7c8d9e0f1a2b3c4d5e6f708192a3b4c"
}
```

### Response

- Success: binary ZIP stream
- Header:
  - `Content-Type: application/zip`
  - `Content-Disposition: attachment; filename="<folder_name>.zip"`
  - `X-Missing-Files: <number>` (jumlah file yang hilang di storage)

### Special Behavior (sudah di-handle)

Jika sebagian file hilang di MinIO:

- ZIP tetap berhasil didownload untuk file yang masih ada
- ZIP akan berisi `missing-files.json` yang berisi daftar file hilang

Jika semua file hilang:

- `404` dengan message `All files in this folder are missing from storage`

---

## 8) Delete Single File

**DELETE** `/api/files/:id/delete`

### Success Response (200)

```json
{
  "success": true,
  "message": "File deleted successfully"
}
```

### Behavior

- Hapus object di MinIO
- Hapus record file di DB (soft delete via paranoid model)

---

## 9) Delete Folder

**DELETE** `/api/files/folders/:folder_id/delete`

### Success Response (200)

```json
{
  "success": true,
  "message": "Folder deleted successfully",
  "data": {
    "deleted_files": 3
  }
}
```

### Behavior

- Hapus semua file dalam folder (storage + DB)
- Hapus folder di DB

---

## FE Integration Tips

- Simpan `folder_id` dari endpoint create/list folder.
- Saat open folder, panggil `GET /folders/:folder_id/files`.
- Saat upload, selalu kirim `folder_id` supaya file masuk folder yang benar.
- Untuk endpoint download (file/folder), gunakan `responseType: 'blob'` di FE.
- Tampilkan warning jika response header `X-Missing-Files` > 0.

## Minimal Axios Examples

### Upload

```javascript
const form = new FormData();
form.append('file', fileInput.files[0]);
form.append('folder_id', folderId);
// form.append('mek', mekHex);

await axios.post('/api/files/upload', form, {
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'multipart/form-data'
  }
});
```

### Download Folder ZIP

```javascript
const res = await axios.post(
  `/api/files/folders/${folderId}/download`,
  { mek: mekHex },
  {
    headers: { Authorization: `Bearer ${token}` },
    responseType: 'blob'
  }
);

const url = window.URL.createObjectURL(new Blob([res.data]));
const a = document.createElement('a');
a.href = url;
a.download = 'folder.zip';
a.click();
window.URL.revokeObjectURL(url);
```

---

## Endpoint Summary

- `POST /api/files/folders` create folder
- `GET /api/files/folders` list folders
- `GET /api/files/folders/:folder_id/files` open folder (list files)
- `POST /api/files/upload` upload file
- `GET /api/files` list all files
- `POST /api/files/:id/download` download file by id
- `POST /api/files/folders/:folder_id/download` download folder zip
- `DELETE /api/files/:id/delete` delete file
- `DELETE /api/files/folders/:folder_id/delete` delete folder
