# Clear Caddy Cache and Force New Build

## 🎯 Problem
Caddy is serving the old cached build (`index-9ec06e74.js`) even after rebuilding.

## 🔧 Solution

### Step 1: Stop All Services
```bash
cd ~/xagent-auto
docker-compose -f docker-compose-with-ollama.yml down
```

### Step 2: Remove Caddy Volumes (Clear Cache)
```bash
docker volume rm xagent-auto_caddy_data xagent-auto_caddy_config xagent-auto_caddy_logs
```

Or if that doesn't work:
```bash
docker volume ls | grep caddy
# Then remove each one manually
docker volume rm <volume_name>
```

### Step 3: Remove Old App Image
```bash
docker rmi xagent-auto_app
```

### Step 4: Rebuild Everything
```bash
docker-compose -f docker-compose-with-ollama.yml build --no-cache app
```

### Step 5: Start Services
```bash
docker-compose -f docker-compose-with-ollama.yml up -d --scale ollama=0
```

### Step 6: Verify New Build
```bash
# Check logs
docker-compose -f docker-compose-with-ollama.yml logs -f app | head -20

# Check if new files exist
docker exec multi-agent-app ls -lh /usr/share/nginx/html/assets/ | head
```

---

## Alternative: Force Nginx to Serve Fresh Files

If Caddy isn't the issue, the problem might be in the app container itself.

### Check What's Actually in the Container:
```bash
# Enter the app container
docker exec -it multi-agent-app sh

# List the built files
ls -lh /usr/share/nginx/html/assets/

# You should see files with different hashes than index-9ec06e74.js
# Exit
exit
```

### If Files Are Still Old:
The build didn't copy the new dist properly. Check:
```bash
cd ~/xagent-auto
ls -lh dist/assets/ | head
```

If `dist/` is missing or has old files, the issue is your source files weren't copied correctly via WinSCP.

---

## Nuclear Option: Complete Clean Rebuild

```bash
cd ~/xagent-auto

# Stop everything
docker-compose -f docker-compose-with-ollama.yml down -v

# Remove all images
docker images | grep xagent-auto | awk '{print $3}' | xargs docker rmi -f

# Rebuild
docker-compose -f docker-compose-with-ollama.yml build --no-cache

# Start
docker-compose -f docker-compose-with-ollama.yml up -d --scale ollama=0
```

---

## Expected Result

After these steps, refresh browser and you should see:
- **Different file hash** (not `index-9ec06e74.js`)
- **No authentication errors**
- ✅ Clean console

Run these commands and let me know what you see!

