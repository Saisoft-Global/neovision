#!/bin/bash
# Cloudflare DDNS Setup Script

echo "🔧 Setting up Cloudflare Dynamic DNS..."

# Install cloudflare-ddns
echo "📥 Downloading cloudflare-ddns..."
curl -L https://github.com/timothymiller/cloudflare-ddns/releases/latest/download/cloudflare-ddns-linux-amd64 -o /usr/local/bin/cloudflare-ddns
chmod +x /usr/local/bin/cloudflare-ddns

# Create config directory
mkdir -p /etc/cloudflare-ddns

echo "✅ Cloudflare DDNS installed!"
echo ""
echo "📝 Next steps:"
echo "1. Edit /etc/cloudflare-ddns/config.conf with your credentials:"
echo "   [cloudflare]"
echo "   api_token=YOUR_CLOUDFLARE_API_TOKEN"
echo "   zone_id=YOUR_ZONE_ID"
echo "   record_name=yourname"
echo "   record_type=A"
echo "   ttl=300"
echo ""
echo "2. Add to crontab:"
echo "   crontab -e"
echo "   Add this line:"
echo "   */5 * * * * /usr/local/bin/cloudflare-ddns -c /etc/cloudflare-ddns/config.conf"
echo ""
echo "3. Test manually:"
echo "   /usr/local/bin/cloudflare-ddns -c /etc/cloudflare-ddns/config.conf"
