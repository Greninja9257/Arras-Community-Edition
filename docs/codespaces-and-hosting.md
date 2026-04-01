# Codespaces and Online Hosting

## GitHub Codespaces

This repo can run inside GitHub Codespaces for development, but there is an important limitation:

- The web client runs on port `3000`
- The game servers run on ports `3001` through `3020`
- Codespaces gives each forwarded port its own public URL
- This game client expects a stable host/port pairing for each game server

That means Codespaces is fine for development and testing, but it is not a clean long-term public host for the current multi-port layout.

### 1. Create the Codespace

1. Push your fork to GitHub.
2. Open the repo on GitHub.
3. Click `Code` -> `Codespaces` -> `Create codespace on main`.
4. Wait for the devcontainer to finish building.

The repo includes `.devcontainer/devcontainer.json`, so Codespaces should:

- build from the repo Dockerfile
- install npm dependencies
- forward ports `3000` to `3020`

### 2. Start the server

Run:

```bash
npm start
```

Then open the forwarded URL for port `3000`.

### 3. Make the port visible

In the Codespaces `Ports` tab:

1. Find port `3000`
2. Right click it
3. Set `Port Visibility` to `Public`

If you want to test game worker ports directly, you can also expose `3001` to `3020`, but that still does not make Codespaces a good public production host.

## Practical online hosting

For an actual always-online public server, use a VPS with Docker and a real domain.

Good options:

- Hetzner VPS
- DigitalOcean Droplet
- Vultr VPS

### Why a VPS is the better fit

- You control all needed ports directly
- WebSocket traffic is predictable
- You can attach a domain and TLS
- The server stays online after you close your browser
- It matches this repo's current multi-port design

## Recommended deployment

### 1. Provision the server

Use Ubuntu 24.04 or 22.04 with at least:

- 2 vCPU
- 4 GB RAM

### 2. Install Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

Log out and back in once after adding your user to the `docker` group.

### 3. Open firewall ports

Open:

- `80`
- `443`
- `3000`
- `3001-3020`

If you use `ufw`:

```bash
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 3000
sudo ufw allow 3001:3020/tcp
sudo ufw enable
```

### 4. Point a domain at the VPS

Create DNS records such as:

- `arras.example.com` -> your VPS public IP

### 5. Clone and configure the app

```bash
git clone <your-fork-url>
cd Arras-Community-Edition
```

Edit `server/.env` and set a real API key.

Then set these environment values before starting:

```bash
export PUBLIC_HOST=arras.example.com
export GAME_HOST=arras.example.com
export PORT=3000
export GAME_PORT_BASE=3001
```

### 6. Run with Docker

```bash
docker build -t arras-ce .
docker run -d --restart unless-stopped --name arras \
  -p 3000:3000 \
  -p 3001-3020:3001-3020 \
  -e PUBLIC_HOST=arras.example.com \
  -e GAME_HOST=arras.example.com \
  -e PORT=3000 \
  -e GAME_PORT_BASE=3001 \
  arras-ce
```

## Reverse proxy and TLS

Use Caddy or Nginx in front of port `3000` for HTTPS on the web client.

Example Caddy config:

```caddy
arras.example.com {
    reverse_proxy 127.0.0.1:3000
}
```

Then run your game ports on `3001-3020` directly on the VPS.

## Important limitation

If you want the whole game to run behind only `443` without exposing `3001-3020`, this repo needs extra proxying or code changes so websocket traffic for each mode is multiplexed through one public endpoint.

That is not how the current client/server setup works today.
