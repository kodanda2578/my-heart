# My Heart - Love Story Website ❤️

A beautiful, interactive love story website with music, gallery, timeline, and secret messages.

## 🚀 How to Update Content (IMPORTANT)
**The Admin Panel (`/admin`) only works on your Local Computer.**
Because websites like Vercel are "Read-Only", you cannot save new photos or text directly on the live site.

**To update your website, follow these steps:**

### 1. Start the Project Locally
Open your terminal in the project folder and run:
```bash
npm run dev
```
Then open **[http://localhost:3000/admin](http://localhost:3000/admin)** in your browser.

### 2. Make Your Changes
- Upload photos 📸
- Change text 📝
- Update music 🎵
- **Save everything.** (This saves files to your computer).

### 3. Publish to Live Site
Once you are happy with the changes on `localhost`, run these commands in your terminal to send them to Vercel:

```bash
git add .
git commit -m "Updated content and photos"
git push origin main
```

**Wait 1-2 minutes**, and your live website (on Vercel) will automatically update with the new content!

## 🛠️ Project Setup
If you are setting this up for the first time:

1.  **Install Dependencies:**
    ```bash
    npm install
    ```
2.  **Run Development Server:**
    ```bash
    npm run dev
    ```
3.  **Access:**
    *   Website: `http://localhost:3000`
    *   Admin Panel: `http://localhost:3000/admin`

## 📂 Project Structure
*   `public/`: Contains all static files (images, music, css, js).
*   `content.json`: The database file storing your text and settings.
*   `server.js`: The backend server handling api requests.

---
*Made with ❤️*
