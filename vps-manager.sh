#!/bin/bash

# ==============================================================================
# JKC Bed Management System - VPS Ubuntu Deployment & Management Script
# Web Server: Caddy (Automatic HTTPS / SSL)
# Domain: jkclin.com
# ==============================================================================

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_NAME="jkc-bed-app"
DOMAIN="jkclin.com"
PORT=3000
CADDYFILE="/etc/caddy/Caddyfile"

print_banner() {
    clear
    echo -e "${CYAN}==============================================================================${NC}"
    echo -e "${WHITE}       🏥 JKC Bed Management System - Ubuntu VPS Control Center 🏥           ${NC}"
    echo -e "${CYAN}==============================================================================${NC}"
    echo -e "${BLUE}  Directory  : ${NC}$APP_DIR"
    echo -e "${BLUE}  Domain     : ${NC}https://$DOMAIN"
    echo -e "${BLUE}  App Port   : ${NC}$PORT (Reverse proxied via Caddy)"
    echo -e "${BLUE}  Web Server : ${NC}Caddy (Auto HTTPS)"
    echo -e "${CYAN}------------------------------------------------------------------------------${NC}"
}

check_root_or_sudo() {
    if [ "$EUID" -ne 0 ]; then
        if ! command -v sudo &> /dev/null; then
            echo -e "${RED}[ERROR] Script membutuhkan akses root atau sudo.${NC}"
            exit 1
        fi
    fi
}

run_sudo() {
    if [ "$EUID" -eq 0 ]; then
        "$@"
    else
        sudo "$@"
    fi
}

install_system_dependencies() {
    echo -e "\n${YELLOW}[1/4] Memeriksa & Menginstall dependensi sistem (curl, git, build-essential)...${NC}"
    run_sudo apt-get update -y
    run_sudo apt-get install -y curl git build-essential ufw debian-keyring debian-archive-keyring apt-transport-https

    # Hentikan dan nonaktifkan Nginx jika ada agar tidak bentrok dengan Caddy di port 80/443
    if command -v nginx &> /dev/null; then
        echo -e "${YELLOW}[INFO] Menonaktifkan Nginx agar tidak bentrok dengan Caddy di port 80/443...${NC}"
        run_sudo systemctl stop nginx 2>/dev/null || true
        run_sudo systemctl disable nginx 2>/dev/null || true
    fi

    # Check Node.js 20
    if ! command -v node &> /dev/null || [ "$(node -v | cut -d'.' -f1 | tr -d 'v')" -lt 18 ]; then
        echo -e "${YELLOW}[2/4] Menginstall Node.js 20 LTS (NodeSource)...${NC}"
        curl -fsSL https://deb.nodesource.com/setup_20.x | run_sudo -E bash -
        run_sudo apt-get install -y nodejs
    else
        echo -e "${GREEN}✓ Node.js $(node -v) sudah terinstall.${NC}"
    fi

    # Check PM2
    if ! command -v pm2 &> /dev/null; then
        echo -e "${YELLOW}[3/4] Menginstall PM2 Process Manager secara global...${NC}"
        run_sudo npm install -g pm2
    else
        echo -e "${GREEN}✓ PM2 sudah terinstall.${NC}"
    fi

    # Check Caddy
    if ! command -v caddy &> /dev/null; then
        echo -e "${YELLOW}[4/4] Menginstall Caddy Web Server...${NC}"
        curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | run_sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg --yes
        curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | run_sudo tee /etc/apt/sources.list.d/caddy-stable.list
        run_sudo apt-get update -y
        run_sudo apt-get install -y caddy
        run_sudo systemctl enable caddy
        run_sudo systemctl start caddy
    else
        echo -e "${GREEN}✓ Caddy Web Server $(caddy version | awk '{print $1}') sudah aktif.${NC}"
    fi
}

setup_env_file() {
    cd "$APP_DIR" || exit 1
    if [ ! -f ".env" ]; then
        echo -e "\n${YELLOW}[INFO] File .env belum ditemukan. Membuat file .env baru...${NC}"
        
        echo -e "${CYAN}Masukkan DATABASE_URL (Supabase PostgreSQL / Direct):${NC}"
        read -r -p "DATABASE_URL: " input_db_url
        if [ -z "$input_db_url" ]; then
            input_db_url="postgresql://postgres.gbkdpkjywtxuihglqial:cJUhl6IRWigCbMOh@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres?connection_limit=2"
        fi

        echo -e "${CYAN}Masukkan NEXTAUTH_SECRET (tekan enter untuk generate otomatis):${NC}"
        read -r -p "NEXTAUTH_SECRET: " input_secret
        if [ -z "$input_secret" ]; then
            input_secret=$(openssl rand -base64 32 2>/dev/null || echo "jkc-secret-$(date +%s)")
        fi

        echo -e "${CYAN}Masukkan NEXTAUTH_URL (Default: https://$DOMAIN):${NC}"
        read -r -p "NEXTAUTH_URL: " input_nextauth_url
        if [ -z "$input_nextauth_url" ]; then
            input_nextauth_url="https://$DOMAIN"
        fi

        cat <<EOF > .env
DATABASE_URL="$input_db_url"
DIRECT_URL="$input_db_url"
NEXTAUTH_SECRET="$input_secret"
NEXTAUTH_URL="$input_nextauth_url"
PORT=$PORT
NODE_ENV=production
EOF
        echo -e "${GREEN}✓ File .env berhasil dibuat!${NC}"
    else
        echo -e "${GREEN}✓ File .env sudah ada.${NC}"
    fi
}

configure_caddy() {
    echo -e "\n${YELLOW}Mengkonfigurasi Caddy Web Server untuk $DOMAIN...${NC}"
    
    # Buat direktori /etc/caddy jika belum ada
    run_sudo mkdir -p /etc/caddy
    if [ ! -f "$CADDYFILE" ]; then
        run_sudo touch "$CADDYFILE"
    fi

    # Backup Caddyfile yang ada
    BACKUP_FILE="/etc/caddy/Caddyfile.bak_$(date +%s)"
    run_sudo cp "$CADDYFILE" "$BACKUP_FILE"
    echo -e "${BLUE}Backup Caddyfile disimpan di: $BACKUP_FILE${NC}"

    # Cek apakah blok jkclin.com sudah ada di Caddyfile
    if grep -q "$DOMAIN" "$CADDYFILE"; then
        echo -e "${GREEN}✓ Konfigurasi untuk $DOMAIN sudah ada di Caddyfile.${NC}"
    else
        echo -e "${YELLOW}Menambahkan konfigurasi reverse proxy $DOMAIN ke Caddyfile...${NC}"
        
        # Tambahkan blok domain ke Caddyfile tanpa merusak konfigurasi website/domain lain
        run_sudo bash -c "cat << 'EOF' >> $CADDYFILE

# --- JKC Bed Management System ($DOMAIN) ---
$DOMAIN, www.$DOMAIN {
    reverse_proxy 127.0.0.1:$PORT
}
EOF"
        echo -e "${GREEN}✓ Blok konfigurasi $DOMAIN berhasil ditambahkan ke Caddyfile.${NC}"
    fi

    # Validasi konfigurasi Caddy
    echo -e "${YELLOW}Memvalidasi konfigurasi Caddy...${NC}"
    if run_sudo caddy validate --adapter caddyfile --config "$CADDYFILE"; then
        echo -e "${GREEN}✓ Validasi Caddyfile sukses!${NC}"
        run_sudo systemctl reload caddy || run_sudo systemctl restart caddy
        echo -e "${GREEN}✓ Caddy berhasil di-reload!${NC}"
    else
        echo -e "${RED}[ERROR] Validasi Caddyfile gagal! Mengembalikan backup...${NC}"
        run_sudo cp "$BACKUP_FILE" "$CADDYFILE"
        run_sudo systemctl reload caddy 2>/dev/null || true
        return 1
    fi
}

# ==============================================================================
# MENU 1: Setup Awal & Jalankan Lokal (Dev Mode)
# ==============================================================================
menu_setup_local() {
    print_banner
    echo -e "${YELLOW}=== MENU 1: SETUP AWAL & RUN LOCAL (DEV MODE) ===${NC}\n"
    
    install_system_dependencies
    setup_env_file

    cd "$APP_DIR" || exit 1
    echo -e "\n${YELLOW}[1/3] Menginstall NPM dependencies...${NC}"
    npm install

    echo -e "\n${YELLOW}[2/3] Generate Prisma Client...${NC}"
    npx prisma generate

    echo -e "\n${YELLOW}[3/3] Menjalankan server dalam mode Development...${NC}"
    echo -e "${GREEN}Aplikasi berjalan di port $PORT (Tekan CTRL+C untuk berhenti).${NC}"
    npm run dev
}

# ==============================================================================
# MENU 2: Setup & Deploy Production (Domain jkclin.com via Caddy)
# ==============================================================================
menu_deploy_production() {
    print_banner
    echo -e "${YELLOW}=== MENU 2: DEPLOY FULL PRODUCTION (DOMAIN $DOMAIN via CADDY) ===${NC}\n"

    install_system_dependencies
    setup_env_file

    cd "$APP_DIR" || exit 1

    echo -e "\n${YELLOW}[1/5] Menginstall package & dependencies (npm install)...${NC}"
    npm install

    echo -e "\n${YELLOW}[2/5] Generate Prisma Client...${NC}"
    npx prisma generate

    echo -e "\n${YELLOW}[3/5] Membangun project Next.js (npm run build)...${NC}"
    npm run build

    echo -e "\n${YELLOW}[4/5] Mengkonfigurasi PM2 Process Manager...${NC}"
    pm2 delete "$APP_NAME" 2>/dev/null || true

    if [ -f "ecosystem.config.js" ]; then
        pm2 start ecosystem.config.js
    else
        pm2 start npm --name "$APP_NAME" -- start -- -p $PORT
    fi

    pm2 save
    pm2 startup | tail -n 1 | grep -E "sudo|pm2" | bash 2>/dev/null || true
    echo -e "${GREEN}✓ Aplikasi berhasil berjalan di PM2!${NC}"

    echo -e "\n${YELLOW}[5/5] Mengkonfigurasi Caddy & Auto HTTPS...${NC}"
    configure_caddy

    # Konfigurasi UFW
    echo -e "\n${YELLOW}Memastikan Firewall UFW membuka port yang diperlukan...${NC}"
    run_sudo ufw allow OpenSSH 2>/dev/null || true
    run_sudo ufw allow 80/tcp 2>/dev/null || true
    run_sudo ufw allow 443/tcp 2>/dev/null || true
    run_sudo ufw --force enable 2>/dev/null || true
    echo -e "${GREEN}✓ Firewall UFW siap (Port 22, 80, 443 diizinkan).${NC}"

    echo -e "\n${PURPLE}==============================================================================${NC}"
    echo -e "${GREEN}🎉 DEPLOY PRODUCTION BERHASIL!${NC}"
    echo -e "${WHITE}Aplikasi Anda sekarang aktif di: ${CYAN}https://$DOMAIN${NC}"
    echo -e "${GREEN}✓ Caddy secara otomatis menerbitkan dan memperbarui sertifikat SSL HTTPS!${NC}"
    echo -e "${PURPLE}==============================================================================${NC}"

    echo -e "\nTekan Enter untuk kembali ke menu utama..."
    read -r
}

# ==============================================================================
# MENU 3: Update Project dari GitHub (Pull & Rebuild)
# ==============================================================================
menu_update_github() {
    print_banner
    echo -e "${YELLOW}=== MENU 3: UPDATE PROJECT DARI GITHUB (GIT PULL & REBUILD) ===${NC}\n"

    cd "$APP_DIR" || exit 1

    if [ ! -d ".git" ]; then
        echo -e "${RED}[ERROR] Folder ini bukan git repository. Pastikan Anda sudah clone via git.${NC}"
        echo -e "Tekan Enter untuk kembali..."; read -r; return
    fi

    current_branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "VPS-Version")
    echo -e "${BLUE}Cabang Git aktif: ${WHITE}$current_branch${NC}"
    
    echo -e "\n${YELLOW}[1/5] Mengambil update terbaru dari GitHub (git pull origin $current_branch)...${NC}"
    git stash 2>/dev/null || true
    git pull origin "$current_branch"

    echo -e "\n${YELLOW}[2/5] Memperbarui dependensi (npm install)...${NC}"
    npm install

    echo -e "\n${YELLOW}[3/5] Generate Prisma Client...${NC}"
    npx prisma generate

    echo -e "\n${YELLOW}[4/5] Membangun ulang Next.js (npm run build)...${NC}"
    npm run build

    echo -e "\n${YELLOW}[5/5] Merestart aplikasi di PM2...${NC}"
    if pm2 describe "$APP_NAME" > /dev/null 2>&1; then
        pm2 reload "$APP_NAME" || pm2 restart "$APP_NAME"
    else
        if [ -f "ecosystem.config.js" ]; then
            pm2 start ecosystem.config.js
        else
            pm2 start npm --name "$APP_NAME" -- start -- -p $PORT
        fi
    fi
    pm2 save

    # Pastikan Caddy tetap reload
    run_sudo systemctl reload caddy 2>/dev/null || true

    echo -e "\n${GREEN}==============================================================================${NC}"
    echo -e "${GREEN}✓ Project berhasil diperbarui dari GitHub dan aktif kembali di https://$DOMAIN!${NC}"
    echo -e "${GREEN}==============================================================================${NC}"

    echo -e "\nTekan Enter untuk kembali ke menu utama..."
    read -r
}

# ==============================================================================
# MENU 4: Cek & Reload Caddy / SSL Status
# ==============================================================================
menu_caddy_status() {
    print_banner
    echo -e "${YELLOW}=== MENU 4: CEK & RELOAD CADDY / SSL STATUS ===${NC}\n"

    echo -e "1. Cek Status Service Caddy"
    echo -e "2. Lihat Isi Caddyfile (/etc/caddy/Caddyfile)"
    echo -e "3. Validasi & Reload Caddy"
    echo -e "4. Lihat Live Log Caddy (Cek penerbitan sertifikat SSL)"
    echo -e "0. Kembali ke Menu Utama"
    echo ""
    read -r -p "Pilihan Anda [0-4]: " caddy_choice

    case $caddy_choice in
        1)
            echo -e "\n${CYAN}--- Status Caddy ---${NC}"
            run_sudo systemctl status caddy --no-pager
            ;;
        2)
            echo -e "\n${CYAN}--- Isi /etc/caddy/Caddyfile ---${NC}"
            run_sudo cat "$CADDYFILE"
            ;;
        3)
            echo -e "\n${YELLOW}Memvalidasi & Mereload Caddy...${NC}"
            if run_sudo caddy validate --adapter caddyfile --config "$CADDYFILE"; then
                run_sudo systemctl reload caddy
                echo -e "${GREEN}✓ Caddy berhasil di-reload!${NC}"
            else
                echo -e "${RED}[ERROR] Validasi Caddyfile gagal.${NC}"
            fi
            ;;
        4)
            echo -e "\n${YELLOW}Membuka log Caddy (Tekan CTRL+C untuk keluar)...${NC}"
            run_sudo journalctl -u caddy -n 50 -f
            ;;
        0)
            return
            ;;
        *)
            echo -e "${RED}Pilihan tidak valid.${NC}"
            ;;
    esac

    echo -e "\nTekan Enter untuk melanjutkan..."
    read -r
}

# ==============================================================================
# MENU 5: Database & Seeding Tools
# ==============================================================================
menu_database_tools() {
    print_banner
    echo -e "${YELLOW}=== MENU 5: DATABASE & SEEDING TOOLS ===${NC}\n"
    cd "$APP_DIR" || exit 1

    echo -e "1. Jalankan Prisma DB Push (Sinkronisasi Schema ke Database)"
    echo -e "2. Jalankan Prisma Seed (Isi Data Awal Bed & User Admin)"
    echo -e "3. Generate Prisma Client"
    echo -e "4. Cek Status Koneksi Database"
    echo -e "0. Kembali ke Menu Utama"
    echo ""
    read -r -p "Pilihan Anda [0-4]: " db_choice

    case $db_choice in
        1)
            echo -e "\n${YELLOW}Menjalankan npx prisma db push...${NC}"
            npx prisma db push
            ;;
        2)
            echo -e "\n${YELLOW}Menjalankan Seeding Database...${NC}"
            if [ -f "run-seed-postgres.js" ]; then
                node run-seed-postgres.js
            else
                npm run db:seed
            fi
            ;;
        3)
            echo -e "\n${YELLOW}Menjalankan npx prisma generate...${NC}"
            npx prisma generate
            ;;
        4)
            echo -e "\n${YELLOW}Mengecek koneksi database...${NC}"
            node -e "const { PrismaClient } = require('@prisma/client'); const p = new PrismaClient(); p.bed.count().then(c => console.log('✅ Koneksi Sukses! Total Bed di DB:', c)).catch(e => console.error('❌ Gagal:', e.message)).finally(() => p.\$disconnect());"
            ;;
        0)
            return
            ;;
        *)
            echo -e "${RED}Pilihan tidak valid.${NC}"
            ;;
    esac

    echo -e "\nTekan Enter untuk melanjutkan..."
    read -r
}

# ==============================================================================
# MENU 6: Service Status & Monitoring (PM2 Logs)
# ==============================================================================
menu_service_manager() {
    print_banner
    echo -e "${YELLOW}=== MENU 6: SERVICE STATUS & MONITORING ===${NC}\n"

    echo -e "1. Lihat Status PM2 & Caddy"
    echo -e "2. Lihat Realtime Logs Aplikasi Next.js (pm2 logs)"
    echo -e "3. Restart Aplikasi (pm2 restart)"
    echo -e "4. Stop Aplikasi (pm2 stop)"
    echo -e "5. Start Aplikasi (pm2 start)"
    echo -e "0. Kembali ke Menu Utama"
    echo ""
    read -r -p "Pilihan Anda [0-5]: " svc_choice

    case $svc_choice in
        1)
            echo -e "\n${CYAN}--- Status PM2 ---${NC}"
            pm2 status
            echo -e "\n${CYAN}--- Status Caddy ---${NC}"
            run_sudo systemctl status caddy --no-pager
            ;;
        2)
            echo -e "\n${YELLOW}Membuka live log PM2 (Tekan CTRL+C untuk keluar dari log)...${NC}"
            pm2 logs "$APP_NAME"
            ;;
        3)
            echo -e "\n${YELLOW}Merestart aplikasi PM2...${NC}"
            pm2 restart "$APP_NAME"
            echo -e "${GREEN}✓ Aplikasi berhasil di-restart.${NC}"
            ;;
        4)
            echo -e "\n${YELLOW}Menghentikan aplikasi PM2...${NC}"
            pm2 stop "$APP_NAME"
            echo -e "${GREEN}✓ Aplikasi dihentikan.${NC}"
            ;;
        5)
            echo -e "\n${YELLOW}Menjalankan aplikasi PM2...${NC}"
            if [ -f "ecosystem.config.js" ]; then
                pm2 start ecosystem.config.js
            else
                pm2 start npm --name "$APP_NAME" -- start -- -p $PORT
            fi
            echo -e "${GREEN}✓ Aplikasi dijalankan.${NC}"
            ;;
        0)
            return
            ;;
        *)
            echo -e "${RED}Pilihan tidak valid.${NC}"
            ;;
    esac

    echo -e "\nTekan Enter untuk melanjutkan..."
    read -r
}

# ==============================================================================
# MAIN LOOP
# ==============================================================================
main() {
    check_root_or_sudo
    while true; do
        print_banner
        echo -e "${WHITE}Silakan pilih menu operasi yang ingin dijalankan:${NC}\n"
        echo -e "  ${GREEN}[1]${NC} 🚀 ${WHITE}Setup Awal & Jalankan Lokal (Dev Mode)${NC}"
        echo -e "  ${GREEN}[2]${NC} 🌐 ${WHITE}Setup & Deploy Full Production (Domain: $DOMAIN via Caddy)${NC}"
        echo -e "  ${GREEN}[3]${NC} 🔄 ${WHITE}Update Project dari GitHub (Git Pull & Rebuild)${NC}"
        echo -e "  ${GREEN}[4]${NC} 🔒 ${WHITE}Cek & Reload Caddy / SSL Status${NC}"
        echo -e "  ${GREEN}[5]${NC} 🗄️  ${WHITE}Database & Seeding Tools${NC}"
        echo -e "  ${GREEN}[6]${NC} 📊 ${WHITE}Service Status, Logs & Restart (PM2)${NC}"
        echo -e "  ${RED}[0]${NC} ❌ ${WHITE}Keluar${NC}"
        echo -e "\n${CYAN}------------------------------------------------------------------------------${NC}"
        read -r -p "Masukkan pilihan Anda [0-6]: " main_choice

        case $main_choice in
            1) menu_setup_local ;;
            2) menu_deploy_production ;;
            3) menu_update_github ;;
            4) menu_caddy_status ;;
            5) menu_database_tools ;;
            6) menu_service_manager ;;
            0)
                echo -e "\n${GREEN}Terima kasih. Sampai jumpa!${NC}\n"
                exit 0
                ;;
            *)
                echo -e "\n${RED}Pilihan tidak valid. Silakan coba lagi.${NC}"
                sleep 1
                ;;
        esac
    done
}

main
