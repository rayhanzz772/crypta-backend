# 🔐 Vault Password Backend with ML Risk Analysis

A secure password management backend API built with Node.js, Express, and Sequelize. This application implements **Argon2id** and **AES-256-GCM** for robust encryption, alongside an **AI-driven ML Risk Analysis Pipeline** using **Retrieval-Augmented Generation (RAG)** to detect and mitigate unauthorized access attempts.

## ✨ Features

- 🔒 **Secure Password Storage**: Passwords encrypted using AES-256-GCM with Argon2id key derivation
- 👤 **User Authentication**: JWT-based authentication system
- 📁 **Category Management**: Organize passwords into categories
- 🔍 **Advanced Search & Filter**: Search and filter vault entries
- 📊 **Audit Logs**: Track all vault operations (create, decrypt, delete)
- 🧠 **Machine Learning Anomaly Detection**: Analyzes login behavior (IP, Location, Device, Time) to generate risk scores
- 🤖 **AI Risk Insights (RAG LLM)**: Automatically generates human-readable security analysis and actionable mitigations via Groq LLM when suspicious activity is detected
- 📧 **Automated Security Alerts**: Triggers real-time email warnings with AI insights for medium/high-risk logins
- 🛡️ **Security Best Practices**:
  - Argon2id for password hashing
  - Master password encryption
  - Salt-based encryption
  - Rate limiting
  - CORS protection
- 📄 **Pagination Support**: Efficient data retrieval for large datasets

## 🚀 Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL/MySQL (configurable via Sequelize)
- **ORM**: Sequelize
- **Authentication**: JWT (jsonwebtoken)
- **Encryption**:
  - Argon2id for key derivation
  - AES-256-GCM for password encryption
- **Validation**: Zod
- **Security**: bcrypt, express-rate-limit
- **AI / LLM API**: Groq SDK (Mixtral/Llama models)
- **Machine Learning API**: Python (Flask / scikit-learn / LightGBM)
- **Email Service**: Mailtrap
- **Utilities**: CUID for unique IDs

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v14 or higher)
- **npm** or **yarn** or **pnpm**
- **PostgreSQL** or **MySQL** database

## 🛠️ Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/rayhanzz772/password-vault-backend.git
   cd password-vault-backend
   ```

2. **Install dependencies**

   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Configure environment variables**

   Create a `.env` file in the root directory:

   ```env
   # Server Configuration
   PORT=5000
   NODE_ENV=development

   # Database Configuration
   DB_CONNECTION=postgres  # or mysql
   DB_HOST=localhost
   DB_PORT=5432           # 5432 for PostgreSQL, 3306 for MySQL
   DB_NAME=vault_password_db
   DB_USER=your_db_user
   DB_PASS=your_db_password

   # JWT Configuration
   JWT_SECRET=your_jwt_secret_key_here
   JWT_EXPIRES_IN=7d

   # Encryption (optional - for additional security)
   ENCRYPTION_KEY=your_encryption_key_here
   ```

4. **Run database migrations**

   ```bash
   npx sequelize-cli db:migrate
   ```

5. **Seed database (optional)**
   ```bash
   npx sequelize-cli db:seed:all
   ```

## 🎯 Usage

### Development Mode

```bash
npm run dev
```

The server will start with nodemon and automatically restart on file changes.

### Production Mode

```bash
npm start
```

The API will be available at `http://localhost:5000` (or your configured PORT).

## 📚 API Documentation

### Base URL

```
http://localhost:5000
```

### Authentication Endpoints

#### Register User

```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe"
}
```

#### Login

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

### Vault Password Endpoints

All vault endpoints require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

#### Get All Vault Passwords (with search & filter)

```http
GET /api/vault?search=gmail&category_id=cat123&limit=20&offset=0&sort_by=name&sort_order=ASC
```

**Query Parameters:**

- `search` (optional): Search in name, username, or note
- `category_id` (optional): Filter by category
- `limit` (optional): Number of results per page (default: 50)
- `offset` (optional): Number of results to skip (default: 0)
- `sort_by` (optional): Sort field - `created_at`, `updated_at`, `name`, `username` (default: `created_at`)
- `sort_order` (optional): `ASC` or `DESC` (default: `DESC`)

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "ckl123456",
      "category_id": "cat123",
      "category": "Social Media",
      "name": "Gmail Account",
      "username": "user@example.com",
      "note": "Personal email",
      "createdAt": "2025-11-05T10:30:00Z",
      "updatedAt": "2025-11-05T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 45,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  },
  "filters": {
    "search": "gmail",
    "category_id": "cat123"
  }
}
```

#### Create Vault Password

```http
POST /api/vault
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "Gmail Account",
  "username": "user@example.com",
  "password": "mySecretPassword",
  "master_password": "myMasterPassword",
  "category_id": "cat123",
  "note": "Personal email account"
}
```

#### Decrypt Vault Password

```http
POST /api/vault/:id/decrypt
Content-Type: application/json
Authorization: Bearer <token>

{
  "master_password": "myMasterPassword"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "ckl123456",
    "name": "Gmail Account",
    "username": "user@example.com",
    "password": "mySecretPassword",
    "note": "Personal email"
  }
}
```

#### Delete Vault Password

```http
DELETE /api/vault/:id
Authorization: Bearer <token>
```

### Category Endpoints

#### Get All Categories

```http
GET /api/categories
Authorization: Bearer <token>
```

#### Create Category

```http
POST /api/categories
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "Social Media",
  "description": "Social media accounts"
}
```

### Tag Endpoints

Tags help organize your secret notes. Supports bulk operations for efficient management.

#### Get All Tags

```http
GET /api/tags?search=work&limit=20&offset=0
Authorization: Bearer <token>
```

#### Create Single Tag

```http
POST /api/tags
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "Important"
}
```

#### Bulk Create Tags

```http
POST /api/tags/bulk
Content-Type: application/json
Authorization: Bearer <token>

{
  "tags": ["Work", "Personal", "Important", "Urgent", "Archive"]
}
```

**Response:**

```json
{
  "success": true,
  "message": "3 tags created successfully",
  "data": {
    "created": [...],
    "skipped": [...],
    "summary": {
      "total": 5,
      "created": 3,
      "skipped": 2
    }
  }
}
```

#### Bulk Update Tags

```http
PUT /api/tags/bulk
Content-Type: application/json
Authorization: Bearer <token>

{
  "tags": [
    { "id": "tag123", "name": "Work Projects" },
    { "id": "tag124", "name": "Personal Notes" }
  ]
}
```

#### Bulk Delete Tags

```http
DELETE /api/tags/bulk
Content-Type: application/json
Authorization: Bearer <token>

{
  "ids": ["tag123", "tag124", "tag125"]
}
```

> 📖 **See [TAGS_API.md](./TAGS_API.md) for complete tag API documentation**

### User Endpoints

#### Get Current User

```http
GET /api/users/me
Authorization: Bearer <token>
```

#### Update User Profile

```http
PUT /api/users/me
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "John Doe Updated",
  "email": "newemail@example.com"
}
```

## 🗂️ Project Structure

```
vault-password-backend/
├── config/
│   └── config.js              # Database configuration
├── db/
│   ├── migrations/            # Database migrations
│   ├── models/                # Sequelize models
│   │   ├── user.js
│   │   ├── vault_password.js
│   │   ├── vault_log.js
│   │   └── category.js
│   └── seeders/               # Database seeders
├── src/
│   ├── middleware/
│   │   └── authMiddleware.js  # JWT authentication middleware
│   ├── modules/
│   │   ├── auth/              # Authentication module
│   │   ├── user/              # User management module
│   │   ├── category/          # Category module
│   │   └── vault-password/    # Vault password module
│   ├── utils/
│   │   ├── encryption.js      # Encryption utilities
│   │   ├── jwt.js             # JWT utilities
│   │   ├── bcrypt.js          # Password hashing
│   │   └── validation.js      # Input validation
│   └── routes.js              # Main route definitions
├── index.js                   # Application entry point
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

## 🧠 Machine Learning & AI Risk Analysis (RAG)

This project implements a state-of-the-art hybrid AI security pipeline, acting as the core of the thesis: **"IMPLEMENTASI ARGON2ID DAN AES-256-GCM PADA SISTEM MANAJEMEN PASSWORD BERBASIS RESTFUL API DENGAN ANALISIS RISIKO AKSES BERBASIS MACHINE LEARNING"**.

### 1. Anomaly Detection (Machine Learning)

When a user logs in, the system extracts features (IP Address, Geolocation, Device/User-Agent, Login Time, VPN status) and sends them to a Python-based ML Microservice. The ML model calculates an **Anomaly Score** and assigns a **Risk Level** (Low, Medium, High).

### 2. Retrieval-Augmented Generation (RAG)

For Medium and High-risk logins, the system performs a RAG workflow:

- **Retrieval**: Fetches the user's _Current Login Context_ (IP, Location, Time) and _Previous Login Context_ (`last_ip`, `last_location`) from the database.
- **Augmentation**: Constructs a precise prompt injecting these real-world data points alongside the ML anomaly score.
- **Generation**: Sends the prompt to a **Large Language Model (via Groq API)**. The LLM acts as an expert cybersecurity analyst to generate a concise, highly accurate risk explanation (e.g., detecting impossible travel) and actionable mitigation steps in HTML format.

### 3. Automated Mitigation

The generated AI insight is instantly injected into an email template and sent to the user via **Mailtrap**, while high-risk accounts are automatically blocked to prevent unauthorized vault decryption.

## 🔐 Security Features

### Encryption Process

1. **Master Password**: User provides a master password for encryption/decryption
2. **Key Derivation**: Argon2id generates a cryptographic key from the master password
3. **Encryption**: Password is encrypted using AES-256-GCM with a unique salt
4. **Storage**: Only encrypted data and salt are stored in the database

### Key Derivation Function (KDF)

```javascript
{
  "kdf_type": "argon2id",
  "kdf_params": {
    "memoryCost": 65536,  // 64 MB
    "timeCost": 3,        // 3 iterations
    "parallelism": 1      // Single thread
  }
}
```

### Authentication

- JWT tokens with configurable expiration
- Bcrypt for user password hashing
- Protected routes with middleware

### Audit Trail

All vault operations are logged:

- Create: When a new password is added
- Decrypt: When a password is viewed
- Delete: When a password is removed

## 🧪 Testing

```bash
# Run tests (if configured)
npm test
```

## 📝 Database Migrations

### Create a new migration

```bash
npx sequelize-cli migration:generate --name migration-name
```

### Run migrations

```bash
npx sequelize-cli db:migrate
```

### Undo last migration

```bash
npx sequelize-cli db:migrate:undo
```

### Undo all migrations

```bash
npx sequelize-cli db:migrate:undo:all
```

## � Testing

This project uses **Jest** for comprehensive testing, particularly for cryptographic utilities.

### Quick Start

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run only encryption tests
npm run test:encryption
```

### Test Coverage

The project includes 32+ comprehensive tests for encryption utilities covering:

- ✅ Basic encryption/decryption functionality
- ✅ Encrypted output structure validation
- ✅ Custom KDF parameter handling
- ✅ Password sensitivity and security
- ✅ Error handling and edge cases
- ✅ Additional Authenticated Data (AAD)
- ✅ Performance benchmarks (< 200ms for encrypt/decrypt)
- ✅ Real-world vault storage scenarios

### Documentation

- 📖 **[TESTING.md](./TESTING.md)** - Comprehensive testing guide with detailed explanations
- 📋 **[TEST_QUICK_REFERENCE.md](./TEST_QUICK_REFERENCE.md)** - Quick command reference and cheat sheet

### CI/CD Integration

Tests automatically run on GitHub Actions for every push and pull request. See `.github/workflows/test.yml` for CI configuration.

## �🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

**Before submitting a PR**, please ensure:

- All tests pass (`npm test`)
- Code coverage remains high (`npm run test:coverage`)
- New features include corresponding tests

## 📄 License

This project is licensed under the ISC License.

## 👨‍💻 Author

**Rayhan**

- GitHub: [@rayhanzz772](https://github.com/rayhanzz772)

## 🙏 Acknowledgments

- Express.js for the web framework
- Sequelize for ORM
- Argon2 for secure key derivation
- JWT for authentication

## 📞 Support

For support, email your-email@example.com or open an issue in the repository.

---

Made with ❤️ by Rayhan
