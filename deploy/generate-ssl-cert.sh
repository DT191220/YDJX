#!/bin/bash
# 生成自签名SSL证书 (仅用于开发/测试环境)
# 生产环境请使用 Let's Encrypt 或购买正式证书

DOMAIN=${1:-localhost}
OUTPUT_DIR=${2:-./ssl}

mkdir -p $OUTPUT_DIR

# 生成私钥
openssl genrsa -out $OUTPUT_DIR/privkey.pem 2048

# 生成证书签名请求
openssl req -new -key $OUTPUT_DIR/privkey.pem -out $OUTPUT_DIR/csr.pem -subj "/CN=$DOMAIN"

# 生成自签名证书 (有效期365天)
openssl x509 -req -days 365 -in $OUTPUT_DIR/csr.pem -signkey $OUTPUT_DIR/privkey.pem -out $OUTPUT_DIR/fullchain.pem

# 清理CSR文件
rm $OUTPUT_DIR/csr.pem

echo "证书已生成到 $OUTPUT_DIR 目录"
echo "  - 私钥: $OUTPUT_DIR/privkey.pem"
echo "  - 证书: $OUTPUT_DIR/fullchain.pem"
echo ""
echo "注意: 自签名证书仅供开发测试使用"
echo "生产环境请使用 Let's Encrypt: https://letsencrypt.org/"
