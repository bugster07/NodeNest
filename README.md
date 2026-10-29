# NoteNest — AI-Powered Study Notes

NoteNest is an AI-powered study notes application that helps users organize their notes, generate concise summaries, create flashcards, and ask questions about their study material.

## Features

- **Authentication:** User registration, login, JWT access tokens, refresh tokens, and logout.
- **Notes Management:** Create, read, update, and delete notes.
- **Notebook Organization:** Organize study material with tags and searchable notes.
- **File Uploads:** Upload PDF and TXT files up to 5 MB and extract their text.
- **AI Summaries:** Generate concise summaries and five key takeaways.
- **AI Flashcards:** Generate question-and-answer flashcards for revision.
- **AI Chat:** Ask questions about your notes using streamed AI responses.
- **Public Sharing:** Generate read-only share links and revoke access when needed.
- **Security:** Ownership checks, request validation, rate limiting, and secure refresh-token cookies.
- **Automated Testing:** Jest and Supertest tests for API functionality and error handling.

## Tech Stack

**Backend**
- Node.js
- Express.js
- MongoDB and Mongoose
- JSON Web Tokens (JWT)
- bcrypt
- Zod
- Multer
- Groq API for AI features
- Jest and Supertest

## Prerequisites

- Node.js and npm
- MongoDB Atlas account or a local MongoDB instance
- Groq API key for AI-powered features

## Installation

Clone the repository:

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd NodeNest/server
npm install
```

Create a `.env` file in the server directory and configure the required environment variables.

Start the development server:

```bash
npm run dev
```

The API runs on port `5000` by default, depending on your server configuration.

## Environment Variables

Configure the following variables in your `.env` file:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_access_token_secret
JWT_REFRESH_SECRET=your_refresh_token_secret
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=your_supported_groq_model
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

Use the exact variable names referenced by your code. Never commit your actual `.env` file or API keys.

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register a user |
| POST | `/api/auth/login` | Log in |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Log out |

### Notes

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/notes` | Create a note |
| GET | `/api/notes` | List notes |
| GET | `/api/notes/:id` | Get a note |
| PATCH | `/api/notes/:id` | Update a note |
| DELETE | `/api/notes/:id` | Delete a note |
| POST | `/api/notes/upload` | Upload a PDF or TXT file |

### AI Features

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/notes/:id/summarize` | Generate a summary |
| POST | `/api/notes/:id/flashcards` | Generate flashcards |
| POST | `/api/notes/:id/ask` | Ask questions about a note |

### Sharing

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/share/:id` | Create a share link |
| GET | `/api/share/:token` | Access a shared note publicly |
| DELETE | `/api/share/:id` | Revoke a share link |

Authenticated endpoints require a valid access token:

```http
Authorization: Bearer YOUR_ACCESS_TOKEN
```

Refresh tokens are handled through HTTP-only cookies.

## Running Tests

Run the automated test suite:

```bash
npm test
```

The current backend test suite contains **54 passing tests**.

## Security Notes

- Keep credentials and API keys in environment variables.
- Ensure `.env` is included in `.gitignore`.
- Notes are scoped to their owners for authenticated operations.
- Public share links provide read-only access and can be revoked.
- AI endpoints have request-rate limits.

## Future Improvements

- Responsive React frontend
- Notebook-based organization
- Semantic search and retrieval-augmented generation
- Docker-based deployment
- Production deployment and monitoring

## License

Add a license appropriate for your project before distributing it.
