# Deployment Instructions

## Local Development

```bash
# Start both servers
node server.js &
python3 -m http.server 8080
```

---

## Production Deployment Options

### Option 1: Railway (Recommended for Hackathon)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Add environment variables
railway variables set NVIDIA_API_KEY=nvapi-xxx
railway variables set MONGODB_URI=mongodb+srv://...
railway variables set QDRANT_URL=https://...
railway variables set QDRANT_API_KEY=xxx

# Deploy
railway up
```

### Option 2: Render

1. Connect GitHub repository
2. Create new Web Service
3. Set build command: `npm install`
4. Set start command: `node server.js`
5. Add environment variables
6. Deploy

### Option 3: Fly.io

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Launch
fly launch

# Set secrets
fly secrets set NVIDIA_API_KEY=nvapi-xxx
fly secrets set MONGODB_URI=mongodb+srv://...

# Deploy
fly deploy
```

### Option 4: Vercel (Frontend Only)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy frontend
vercel
```

---

## Docker Deployment

### Dockerfile

```dockerfile
FROM node:18-slim

# Install Python and dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

RUN pip3 install edge-tts Pillow

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3001

CMD ["node", "server.js"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  backend:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NVIDIA_API_KEY=${NVIDIA_API_KEY}
      - MONGODB_URI=${MONGODB_URI}
      - QDRANT_URL=${QDRANT_URL}
      - QDRANT_API_KEY=${QDRANT_API_KEY}
    volumes:
      - uploads:/app/uploads

  frontend:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - .:/usr/share/nginx/html
    depends_on:
      - backend

volumes:
  uploads:
```

### Run with Docker

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

---

## Production Checklist

### Security

- [ ] Change `SESSION_SECRET` to strong random value
- [ ] Enable MongoDB Atlas IP whitelisting
- [ ] Use HTTPS in production
- [ ] Remove `console.log` statements
- [ ] Set `NODE_ENV=production`

### Performance

- [ ] Enable gzip compression
- [ ] Set proper cache headers
- [ ] Use CDN for static assets
- [ ] Optimize image sizes

### Monitoring

- [ ] Add error tracking (Sentry)
- [ ] Set up logging
- [ ] Monitor API usage
- [ ] Track response times

---

## Environment Variables for Production

```bash
# Required
NVIDIA_API_KEY=nvapi-xxx
MONGODB_URI=mongodb+srv://...
QDRANT_URL=https://...
QDRANT_API_KEY=xxx

# Production-specific
NODE_ENV=production
SESSION_SECRET=your-strong-random-secret
PORT=3001

# Optional
LOG_LEVEL=info
CORS_ORIGIN=https://yourdomain.com
```

---

## Post-Deployment Verification

```bash
# Check health endpoint
curl https://your-app.onrender.com/health

# Test API endpoints
curl -X POST https://your-app.onrender.com/api/generate-curriculum \
  -H "Content-Type: application/json" \
  -d '{"topic": "Python Basics", "student_id": "test-123"}'
```

---

## Rollback Procedure

```bash
# Railway
railway rollback

# Render
# Use dashboard to redeploy previous version

# Fly.io
fly releases list
fly releases rollback <release-id>
```
