# FRIDAY PM Notification Service Architecture
**Date:** April 18, 2026

## 🏗️ Architectural Overview
The notification system in FRIDAY is designed as a **hybrid pull-based system** with a fire-and-forget internal service layer. It prioritizes database persistence and asynchronous UI updates over heavy real-time websocket overhead.

---

## 🛠️ Software Stack

### 1. Service Layer (`lib/pm/notification-service.ts`)
The core logic resides here, providing a high-level API for the rest of the application:
*   `notify(userId, type, title, payload)`: Creates a database record and triggers side effects (like email).
*   `notifyMany(userIds, ...)`: Batch notification utility.
*   `extractMentions(text)`: Regex-based parser for `@user` handles.
*   `resolveMentions(handles)`: Maps handles to database `userId`s using fuzzy name/email matching.

### 2. Router Layer (`lib/trpc/routers/pm-notifications.ts`)
Exposes the notification store to the frontend via tRPC:
*   `list`: Paginated fetch of user notifications.
*   `unreadCount`: Lightweight query for the "badge" count.
*   `markRead` / `markAllRead`: State management endpoints.

---

## 💾 Data Model (Prisma)
The `PmNotification` model is optimized for fast lookups by user and read state:

```prisma
model PmNotification {
  id        String   @id @default(cuid())
  userId    String
  type      String   // e.g., "mentioned", "comment_added"
  title     String
  payload   Json?    // Contextual data (issueId, projectId, etc.)
  read      Boolean  @default(false)
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id])
}
```

---

## 📡 Infrastructure & Transport

### 1. In-App Transport (Polling)
Instead of a permanent WebSocket connection for every user, the `NotificationBell` uses **TanStack Query intelligent polling**:
*   **Strategy:** Polls the `unreadCount` endpoint every **30 seconds**.
*   **Behavior:** Only fetches the full notification list when the user explicitly clicks the bell (lazy loading).

### 2. Email Layer (Stubbed)
Currently, `sendEmailNotification` is a logic stub:
*   **Current State:** Logs the email content to the server console.
*   **Infrastructure Ready:** Designed to be swapped with a provider like **Resend** or **Amazon SES** without changing the call sites.

### 3. Trigger Logic
Notifications are triggered **synchronously** within TRPC mutations.
*   *Example:** When a comment is created, the `pmCommentsRouter` explicitly calls the notification service to alert the issue assignee and any mentioned users.

---

## 🔍 Key Workflows

### The "@Mention" Flow
1.  **Frontend:** User types `Hello @stav` in a comment.
2.  **API:** Mutation `pmComments.create` is called.
3.  **Service:** `extractMentions` finds `stav`.
4.  **Database:** `resolveMentions` searches `User` table for names/emails matching `stav`.
5.  **Record:** If found, a `PmNotification` record is created for that `userId`.
6.  **UI:** The target user's `NotificationBell` polls, sees the new count, and displays the badge.

---

## 🚀 Potential Improvements
1.  **WebSocket Push:** Move from 30s polling to real-time `socket.io` emits for "Instant" notifications (Infrastructure for Socket.io already exists in the project).
2.  **Notification Preferences:** Add a `UserSetting` table to allow users to toggle specific types (e.g., "Mute issue_updated emails").
3.  **Aggregated Notifications:** Group "5 updates to issue PROJ-1" into a single notification to avoid spamming.
