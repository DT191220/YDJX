#!/bin/bash
#===============================================================================
# 驾校通 Ubuntu 一键部署脚本
# 支持: Ubuntu 20.04/22.04 LTS
# 部署方式: Docker Compose
#===============================================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的信息
info() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# 检查是否为root用户
check_root() {
    if [ "$EUID" -ne 0 ]; then
        error "请使用 root 用户或 sudo 运行此脚本"
    fi
}

# 检查系统版本
check_system() {
    info "检查系统版本..."
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        if [ "$ID" != "ubuntu" ]; then
            error "此脚本仅支持 Ubuntu 系统"
        fi
        success "系统版本: $PRETTY_NAME"
    else
        error "无法识别系统版本"
    fi
}

# 更新系统
update_system() {
    info "更新系统软件包..."
    apt-get update -y
    apt-get upgrade -y
    success "系统更新完成"
}

# 安装基础工具
install_basic_tools() {
    info "安装基础工具..."
    apt-get install -y \
        curl \
        wget \
        git \
        vim \
        htop \
        unzip \
        openssl \
        ca-certificates \
        gnupg \
        lsb-release
    success "基础工具安装完成"
}

# 安装 Docker
install_docker() {
    info "检查 Docker 安装状态..."
    
    if command -v docker &> /dev/null; then
        success "Docker 已安装: $(docker --version)"
        return
    fi
    
    info "安装 Docker..."
    
    # 添加 Docker 官方 GPG 密钥
    mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    
    # 设置仓库
    echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
        $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # 安装 Docker Engine
    apt-get update -y
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # 启动 Docker
    systemctl start docker
    systemctl enable docker
    
    success "Docker 安装完成: $(docker --version)"
}

# 安装 Docker Compose
install_docker_compose() {
    info "检查 Docker Compose 安装状态..."
    
    if docker compose version &> /dev/null; then
        success "Docker Compose 已安装: $(docker compose version)"
        return
    fi
    
    info "安装 Docker Compose..."
    apt-get install -y docker-compose-plugin
    success "Docker Compose 安装完成"
}

# 创建部署目录
create_deploy_dir() {
    DEPLOY_DIR=${DEPLOY_DIR:-/opt/jiaxiaotong}
    
    info "创建部署目录: $DEPLOY_DIR"
    mkdir -p $DEPLOY_DIR
    cd $DEPLOY_DIR
    success "部署目录创建完成"
}

# 生成安全密钥
generate_secrets() {
    info "生成安全密钥..."
    
    if [ -z "$JWT_SECRET" ]; then
        JWT_SECRET=$(openssl rand -base64 32)
        info "已生成 JWT_SECRET"
    fi
    
    if [ -z "$DB_PASSWORD" ]; then
        DB_PASSWORD=$(openssl rand -base64 16 | tr -dc 'a-zA-Z0-9' | head -c 16)
        info "已生成 DB_PASSWORD"
    fi
    
    if [ -z "$ENCRYPT_KEY" ]; then
        ENCRYPT_KEY="YuanDongDrivingSchool$(openssl rand -base64 8 | tr -dc 'a-zA-Z0-9')!@#"
        info "已生成 ENCRYPT_KEY"
    fi
    
    success "安全密钥生成完成"
}

# 创建环境变量文件
create_env_file() {
    info "创建环境变量文件..."
    
    cat > $DEPLOY_DIR/.env << EOF
# 驾校通环境变量配置
# 生成时间: $(date)

# 数据库配置
DB_PASSWORD=$DB_PASSWORD
DB_NAME=yuandong_driving_school

# JWT密钥 (身份认证)
JWT_SECRET=$JWT_SECRET

# 加密密钥 (前后端通信)
ENCRYPT_KEY=$ENCRYPT_KEY

# 运行环境
NODE_ENV=production
EOF

    chmod 600 $DEPLOY_DIR/.env
    success "环境变量文件创建完成: $DEPLOY_DIR/.env"
}

# 克隆或复制项目代码
setup_project() {
    info "设置项目代码..."
    
    # 如果当前目录有代码，询问是否使用
    if [ -f "./docker-compose.yml" ]; then
        success "检测到项目代码已存在"
        return
    fi
    
    # 如果有 GIT_REPO 变量，从 Git 克隆
    if [ -n "$GIT_REPO" ]; then
        info "从 Git 仓库克隆代码..."
        git clone $GIT_REPO .
        success "代码克隆完成"
        return
    fi
    
    warning "未找到项目代码，请手动上传项目文件到 $DEPLOY_DIR"
    warning "上传完成后重新运行此脚本"
    exit 0
}

# 构建 Docker 镜像
build_images() {
    info "构建 Docker 镜像..."
    
    cd $DEPLOY_DIR
    
    # 构建镜像
    docker compose build --no-cache
    
    success "Docker 镜像构建完成"
}

# 启动服务
start_services() {
    info "启动服务..."
    
    cd $DEPLOY_DIR
    
    # 启动所有服务
    docker compose up -d
    
    # 等待服务启动
    info "等待服务启动..."
    sleep 10
    
    # 检查服务状态
    docker compose ps
    
    success "服务启动完成"
}

# 配置防火墙
configure_firewall() {
    info "配置防火墙..."
    
    # 检查 ufw 是否安装
    if ! command -v ufw &> /dev/null; then
        apt-get install -y ufw
    fi
    
    # 允许 SSH
    ufw allow 22/tcp
    
    # 允许 HTTP 和 HTTPS
    ufw allow 80/tcp
    ufw allow 443/tcp
    
    # 启用防火墙
    echo "y" | ufw enable
    
    success "防火墙配置完成"
}

# 显示部署信息
show_info() {
    echo ""
    echo "==============================================================================="
    echo -e "${GREEN}  驾校通部署完成!${NC}"
    echo "==============================================================================="
    echo ""
    echo "  访问地址: http://$(curl -s ifconfig.me 2>/dev/null || echo 'YOUR_SERVER_IP')"
    echo ""
    echo "  重要信息 (请妥善保存):"
    echo "  -----------------------------------------"
    echo "  数据库密码: $DB_PASSWORD"
    echo "  JWT密钥: $JWT_SECRET"
    echo "  加密密钥: $ENCRYPT_KEY"
    echo ""
    echo "  常用命令:"
    echo "  -----------------------------------------"
    echo "  查看服务状态:  cd $DEPLOY_DIR && docker compose ps"
    echo "  查看日志:      cd $DEPLOY_DIR && docker compose logs -f"
    echo "  重启服务:      cd $DEPLOY_DIR && docker compose restart"
    echo "  停止服务:      cd $DEPLOY_DIR && docker compose down"
    echo ""
    echo "  下一步:"
    echo "  -----------------------------------------"
    echo "  1. 配置域名解析 (可选)"
    echo "  2. 配置SSL证书: $DEPLOY_DIR/deploy/generate-ssl-cert.sh"
    echo "  3. 初始化数据库数据"
    echo ""
    echo "==============================================================================="
}

# 保存部署信息到文件
save_deploy_info() {
    cat > $DEPLOY_DIR/deploy-info.txt << EOF
驾校通部署信息
生成时间: $(date)
===============================================

数据库密码: $DB_PASSWORD
JWT密钥: $JWT_SECRET
加密密钥: $ENCRYPT_KEY

部署目录: $DEPLOY_DIR
服务器IP: $(curl -s ifconfig.me 2>/dev/null || echo 'N/A')

注意: 此文件包含敏感信息，请妥善保管!
EOF

    chmod 600 $DEPLOY_DIR/deploy-info.txt
    info "部署信息已保存到: $DEPLOY_DIR/deploy-info.txt"
}

# 主函数
main() {
    echo ""
    echo "==============================================================================="
    echo "                    驾校通 Ubuntu 一键部署脚本"
    echo "==============================================================================="
    echo ""
    
    check_root
    check_system
    update_system
    install_basic_tools
    install_docker
    install_docker_compose
    create_deploy_dir
    generate_secrets
    create_env_file
    setup_project
    build_images
    start_services
    configure_firewall
    save_deploy_info
    show_info
}

# 运行主函数
main "$@"
