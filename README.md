# CampusConnect Lite

CampusConnect Lite is a high-performance, mobile-first educational social platform optimized for low-bandwidth environments. It is designed to foster collaboration between students and teachers through classroom management, real-time peer communication, and personalized AI guidance.

## 🌟 Key Features

- **Classroom Hub**: Join classes, access study materials, and participate in course-specific discussions.
- **Campus Feed**: A public social feed to share updates and interact with the campus community.
- **Direct Messaging**: Connect with peers and teachers through secure real-time messaging.
- **Socratic AI Assistant**: "The Guide" — an AI study aide that helps you learn by asking questions rather than just giving answers.
- **Smart Profile**: Customizable student/teacher profiles with profile picture uploads via Firebase Storage.
- **Mobile-Optimized**: Lightning-fast UI built for seamless use on any device.

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS 4.0
- **Animations**: Motion (formerly Framer Motion)
- **Backend Service**: Node.js with Express
- **Database & Auth**: Firebase Firestore, Firebase Authentication
- **Media Storage**: Firebase Storage
- **AI Integration**: Google Gemini 1.5 Flash (server-side proxy for security)

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- A Firebase Project
- A Gemini API Key (from [Google AI Studio](https://aistudio.google.com/))

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/campusconnect-lite.git
   cd campusconnect-lite
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Environment Setup**:
   - Copy `.env.example` to a new file named `.env`.
   ```bash
   cp .env.example .env
   ```
   - Add your `GEMINI_API_KEY` to the `.env` file.

4. **Firebase Configuration**:
   - Place your `firebase-applet-config.json` in the root directory (ensure it matches your Firebase project credentials).

### Running Locally

```bash
# Start the development server
npm run dev
```
The app will be available at `http://localhost:3000`.

## 📦 Building for Production

```bash
npm run build
npm start
```

## 🛡️ Security

This project is configured to be GitHub-ready:
- **API Protection**: The Gemini API key is kept on the server and never exposed to the browser.
- **Environment Management**: sensitive keys are stored in `.env` (ignored by git).
- **Protected Rules**: Secure Firestore and Storage rules are implemented to ensure data privacy.

## 📝 License

This project is licensed under the MIT License.
