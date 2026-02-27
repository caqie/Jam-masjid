# Masjid Digital Display System

A modern, responsive, and feature-rich digital display system designed for Masjids and Musholas. This application provides real-time prayer schedules, media announcements, and remote control capabilities.

## 🌟 Features

- **Dual Clock Themes**: Choose between a luxurious Analog Clock or a modern Digital Clock.
- **Real-time Prayer Schedules**: Automatic calculation based on location with support for manual offsets (Koreksi Jadwal).
- **Hijri Calendar**: Integrated Hijri date display.
- **Media Carousel**: Display announcements, posters, or videos in a beautiful, responsive carousel.
- **Running Text**: Customizable marquee for important announcements.
- **Iqomah Countdown**: Automatic countdown after Adhan to help jama'ah prepare for prayer.
- **Adhan Audio**: Support for automatic Adhan audio playback.
- **Remote Control**: Control the display from any smartphone using a unique Room ID or QR Code.
- **Fully Responsive**: Optimized for everything from small mobile screens to large 4K TV displays.

## 🚀 Installation Guide

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/)

### Steps

1. **Clone the Repository** (or download the source code):
   ```bash
   git clone <repository-url>
   cd masjid-digital-display
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Run in Development Mode**:
   ```bash
   npm run dev
   ```
   The application will be accessible at `http://localhost:3000`.

4. **Build for Production**:
   ```bash
   npm run build
   ```
   The production-ready files will be in the `dist/` directory.

## ⚙️ Configuration & Settings

Access the **Panel Admin** by clicking the **Settings (Gear)** icon in the top right corner of the display.

### 1. Identitas (Identity)
- **Nama Masjid**: Set the name of your Masjid/Mushola.
- **Alamat**: Set the physical address.
- **Running Text**: Enter the announcement text that will scroll at the bottom.
- **Jeda Iqomah**: Set the duration (in minutes) for the countdown after Adhan.
- **Lokasi**: Set the City and Country for accurate prayer time calculations.

### 2. Jadwal (Schedule Correction)
- If the automatic calculation differs from your local schedule, use the **Koreksi Jadwal** tab.
- Enter positive numbers (e.g., `2`) to delay or negative numbers (e.g., `-2`) to advance the time for each prayer.

### 3. Media (Announcements)
- Add URLs for images or videos to be displayed in the carousel.
- Supported formats: `.jpg`, `.png`, `.mp4`, etc.

### 4. Tampilan (Appearance & Sound)
- **Tema Jam**: Switch between Digital and Analog.
- **Font Jam**: Choose from several premium font styles for the digital clock.
- **Adhan Audio**: Enable/Disable automatic Adhan playback and set custom URLs for the audio files.
- **Fullscreen**: Optimize the display for TV screens.

## 📺 Android TV / Smart TV Setup

To use this application as a dedicated display on an Android TV or Smart TV, follow these steps to ensure it stays active and starts automatically:

### 1. Progressive Web App (PWA)
This application is a **PWA**, meaning it can be installed like a native app and works **offline**:
- Open the application URL in your TV's browser (e.g., Chrome or Puffin).
- Look for the "Add to Home Screen" or "Install App" option in the browser menu.
- Once installed, the app will appear in your TV's app list.

### 2. Auto-Start on Boot
To make the application start automatically when the TV is turned on:
- Install a "Launch on Boot" app from the Google Play Store (e.g., **Launch on Boot** or **AutoStart**).
- Open the "Launch on Boot" app and select the **Masjid Digital Display** (or your browser with the app URL) as the startup app.
- Enable the "Launch on Boot" service.

### 3. Stay Awake (Standby Mode)
The application includes a **Wake Lock** feature that prevents the TV from going to sleep while the display is active. 
- Ensure you interact with the screen once (click or touch) after opening to activate the **Wake Lock** and **Fullscreen** mode.

### 4. Offline Support
The application automatically caches prayer times and assets. If the internet connection is lost:
- The display will continue to show the last cached prayer times.
- A "Mode Offline" indicator will appear to notify you.
- Once the internet is restored, it will automatically synchronize with the latest data.

## 📱 Remote Control Setup

1. Open the **Settings** panel on the main display.
2. Scan the **QR Code** with your smartphone or visit the provided Remote URL.
3. Enter the **Room ID** shown on the display.
4. You can now update settings, change media, or trigger Adhan directly from your phone.

## 🛠️ Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Prayer Times**: Adhan.js
- **Real-time**: Socket.io (for remote control)

---

Developed with ❤️ for the Ummah.
