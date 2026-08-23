
# Meridian Pivot Simulation - Asynchronous Check-in System

An asynchronous event check-in kiosk system for Solstice Events Co., demonstrating the transition from synchronous to asynchronous badge printing with queue-based processing and webhook callbacks.

## 📋 Overview

This solution addresses the challenge of migrating from a synchronous badge printing API to an asynchronous model. When attendees scan their QR codes, print jobs are queued, and the UI updates only when the webhook confirms completion.

### Key Features
- ✅ **Asynchronous Processing**: Queue-based print job handling
- 🔄 **Real-time Status Updates**: Server-Sent Events (SSE) for UI updates
- 🛡️ **Duplicate Prevention**: Atomic operations prevent duplicate check-ins
- 📨 **Webhook Integration**: Vendor callback handling with signature verification
- 🔁 **Out-of-Order Handling**: Gracefully manages delayed/out-of-order webhooks
- 💪 **Resilience**: Automatic retries with exponential backoff


## 🚀 Technologies

- **Node.js** + **Express.js** - Backend framework
- **BullMQ** - Message queue for print jobs
- **Redis** - State management & atomic operations
- **Server-Sent Events (SSE)** - Real-time UI updates
- **Jest** - Testing framework
- **Docker** - Containerization


## 🔧 Installation

### Prerequisites
- Node.js (v16 or higher)
- Docker & Docker Compose
- Redis (if not using Docker)

### Quick Start

```bash
# Clone the repository
git clone <https://github.com/Dasi202/Check-in-System.git>
cd Check-in-System

# Install dependencies
npm install

# Start Redis and application with Docker
npm run docker:up

# Or run locally
npm start

