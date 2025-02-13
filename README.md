# Synoptic - Synthetic Data Generation Platform

A modern, responsive website for Synoptic's synthetic data generation platform, built with Next.js 14, TypeScript, and Tailwind CSS.

## 🚀 Features

- **Modern Stack**: Built with Next.js 14, TypeScript, and Tailwind CSS
- **Responsive Design**: Fully responsive across all device sizes
- **Dark Mode**: Built-in dark mode support with system preference detection
- **Interactive UI**: Smooth animations and transitions using Framer Motion
- **3D Graphics**: Three.js integration for interactive 3D elements
- **Waitlist System**: MongoDB-backed waitlist with email notifications
- **Rate Limiting**: Built-in rate limiting for API endpoints
- **Email Integration**: Automated email notifications using Resend

## 🛠️ Tech Stack

- **Framework**: Next.js 14
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: MongoDB
- **Email Service**: Resend
- **3D Graphics**: Three.js, React Three Fiber
- **Animation**: Framer Motion
- **Icons**: React Icons
- **Deployment**: Vercel

## 📦 Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/synoptic.git
cd synoptic
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file in the root directory with the following variables:
```env
MONGODB_URI=your_mongodb_connection_string
RESEND_API_KEY=your_resend_api_key
ADMIN_EMAIL=your_admin_email
FROM_EMAIL=your_sender_email
SENDER_NAME='Synoptic'
```

4. Run the development server:
```bash
npm run dev
```

## 🌐 Environment Variables

- `MONGODB_URI`: MongoDB connection string
- `RESEND_API_KEY`: API key for Resend email service
- `ADMIN_EMAIL`: Email address for admin notifications
- `FROM_EMAIL`: Sender email address for notifications
- `SENDER_NAME`: Name to display in email notifications

## 📁 Project Structure

```
src/
├── app/                  # Next.js app directory
│   ├── api/             # API routes
│   └── page.tsx         # Main page component
├── components/          # React components
│   ├── ui/             # Reusable UI components
│   └── ...             # Feature components
├── lib/                # Utility functions and services
│   ├── mongodb.ts      # MongoDB configuration
│   ├── email.ts        # Email service
│   └── rate-limit.ts   # Rate limiting utility
└── context/            # React context providers
```

## 🔒 Security Features

- Rate limiting on API endpoints
- MongoDB connection pooling
- Secure email handling
- Input validation and sanitization
- TLS/SSL configuration for MongoDB

## 📧 Email Templates

The system includes two email templates:
1. **Waitlist Confirmation**: Sent to users upon successful registration
2. **Admin Notification**: Sent to administrators for new submissions

## 🚀 Deployment

The project is configured for deployment on Vercel:

1. Push your code to GitHub
2. Import the project in Vercel
3. Configure environment variables in Vercel dashboard
4. Deploy!

## 💻 Development

- **Start development server**: `npm run dev`
- **Build for production**: `npm run build`
- **Start production server**: `npm run start`
- **Run linter**: `npm run lint`

## 🤝 Contributing

1. Fork the repository
2. Create a new branch
3. Make your changes
4. Submit a pull request

## 📄 License

This project is private and confidential. All rights reserved.

## 🏢 Company Information

Synoptic
1111B S Governors Ave STE 26703
Dover, DE 19904

## ⚠️ Requirements

- Node.js >= 18.17.0
- MongoDB
- Resend account for email functionality
