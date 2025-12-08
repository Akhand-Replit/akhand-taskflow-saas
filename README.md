# TaskFlow - Modern Collaborative Task Management

TaskFlow is a powerful, real-time task management application built with **Next.js 16** and **Firebase**. It provides teams with a streamlined interface to manage projects, track employee workloads, and stay updated with real-time notifications.

## 🚀 Features

- **Real-Time Dashboard**: Get an instant overview of project health with live statistics on pending tasks, completed work, and team size.
- **Employee Workload Tracking**: Visualize task distribution across your team to identify bottlenecks and balance workloads effectively.
- **Live Notifications**: tailored updates for task assignments, comments, status changes, and replies.
- **Task Management**: Create, assign, prioritize, and track tasks through their lifecycle (Todo, In Progress, Review, Done).
- **Kanban Board**: Drag-and-drop interface for intuitive task organization (powered by `@dnd-kit`).
- **Secure Authentication**: Robust user management using Firebase Authentication.
- **Modern UI/UX**: A beautiful, responsive interface featuring Dark Mode support, built with **Tailwind CSS 4** and **Shadcn UI**.

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **UI Components**: [Shadcn UI](https://ui.shadcn.com/) (Radix Primitives)
- **Backend & Database**: [Firebase](https://firebase.google.com/) (Firestore, Auth, Storage)
- **Icons**: [Lucide React](https://lucide.dev/)
- **State/Drag & Drop**: `@dnd-kit` for Kanban interactions.
- **Charts/Visualization**: `recharts` for data visualization.

## 📦 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v18 or higher)
- **npm** or **yarn**
- A **Firebase** project with Firestore and Authentication enabled.

## 🔧 Installation & Setup

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/taskflow.git
    cd taskflow
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Configure Environment Variables**
    Create a `.env.local` file in the root directory and add your Firebase configuration credentials:

    ```env
    NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
    NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
    ```

4.  **Run the Development Server**
    ```bash
    npm run dev
    ```

    Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## 📖 User Guide

### Dashboard
The dashboard acts as the central hub.
- **Stats Cards**: View high-level metrics like Total Pending, Completed Tasks, and Team Size.
- **Workload Table**: See what each team member is working on. Columns show their current focus, backlog, and review status.
- **Recent Tasks**: A list of the most recently active tasks for quick access.

### Managing Tasks
- Navigate to the **Kanban Board** (via sidebar) to view tasks in columns.
- Drag and drop cards to update their status.
- Click on a card to edit details, assign members, or add comments.

### Notifications
- The **Notification Feed** on the dashboard keeps you updated on relevant changes.
- You'll receive alerts when you are assigned a task or when someone comments on your work.

## 📂 Project Structure

```
taskflow/
├── app/                  # Next.js App Router pages and layouts
│   ├── (dashboard)/      # Protected dashboard routes
│   ├── login/            # Authentication pages
│   └── layout.tsx        # Root layout
├── components/           # Reusable UI components
│   ├── kanban/           # Kanban board specific components
│   ├── ui/               # Shadcn UI primitives (Button, Card, etc.)
│   └── providers/        # Context providers (Auth, Theme)
├── lib/                  # Utility functions and Firebase config
├── types/                # TypeScript interfaces
└── public/               # Static assets
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1.  Fork the project
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

This project is made by [Mohammad Rafiq Shuvo](https://github.com/Shuvo-2525/)
