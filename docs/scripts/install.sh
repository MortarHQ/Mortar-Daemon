#!/bin/bash

# 设置颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# 接收参数
COMMAND=$1
REQUIRED_NODE_VERSION=20
BUNDLED_NODE_VERSION=v20.11.0
CURRENT_DIR=${PWD}
NODE_ZIP_DIR=${CURRENT_DIR}/node_${BUNDLED_NODE_VERSION}
PROJECT_ZIP_URL="https://github.com/MortarHQ/Mortar-Daemon/archive/refs/heads/master.zip"
PROJECT_DIR=${CURRENT_DIR}/Mortar-Daemon-master

# 打印带颜色的消息
print_info() {
    echo -e "${GREEN}[信息] $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}[警告] $1${NC}"
}

print_error() {
    echo -e "${RED}[错误] $1${NC}"
}

# 安全性提醒
print_info "此脚本需要安装 curl 和 unzip。请确保你已经安装了这些工具，或者有足够的权限来安装它们。"

# 系统检测
case "$(uname -s)" in
Linux*) OS=linux ;;
Darwin*) OS=darwin ;;
*)
    print_error "不支持的操作系统。"
    print_error "请尝试手动安装！"
    exit 1
    ;;
esac

NODE_DIR=${NODE_ZIP_DIR}/node-${BUNDLED_NODE_VERSION}-${OS}-x64

# 检测并安装必要的工具：curl 和 unzip
for tool in curl unzip; do
    if ! command -v $tool &>/dev/null; then
        print_warning "$tool 未安装。尝试安装..."
        # 跨平台支持
        case "$(uname -s)" in
        Linux*)
            if [ -f /etc/debian_version ]; then
                sudo apt-get install $tool -y
            elif [ -f /etc/redhat-release ]; then
                sudo yum install $tool -y
            else
                print_error "不支持的 Linux 发行版。请手动安装 $tool。"
                exit 1
            fi
            ;;
        Darwin*)
            brew install $tool
            ;;
        *)
            print_error "不支持的操作系统。请手动安装 $tool。"
            exit 1
            ;;
        esac
    fi
done

# 检查系统是否已安装 Node.js
USE_SYSTEM_NODE=false
if command -v node &>/dev/null; then
    NODE_VERSION=$(node -v)
    print_info "检测到系统已安装 Node.js ${NODE_VERSION}"
    
    # 去除版本号中的 'v' 前缀用于比较
    VERSION_NUMBER=${NODE_VERSION#v}
    MAJOR_VERSION=$(echo $VERSION_NUMBER | cut -d. -f1)
    
    if [ "$MAJOR_VERSION" -ge $REQUIRED_NODE_VERSION ]; then
        print_info "系统 Node.js 版本满足要求（>= v${REQUIRED_NODE_VERSION}）"
        USE_SYSTEM_NODE=true
    else
        print_warning "系统 Node.js 版本（${NODE_VERSION}）低于推荐版本（v${REQUIRED_NODE_VERSION}）"
        read -p "是否继续使用当前系统的 Node.js？(y/n): " CONTINUE_WITH_SYSTEM_NODE
        if [[ $CONTINUE_WITH_SYSTEM_NODE =~ ^[Yy]$ ]]; then
            print_info "将使用系统 Node.js ${NODE_VERSION}"
            USE_SYSTEM_NODE=true
        else
            print_info "将使用脚本提供的 Node.js ${BUNDLED_NODE_VERSION}"
        fi
    fi
else
    print_info "系统未安装 Node.js，将使用脚本提供的 Node.js ${BUNDLED_NODE_VERSION}"
fi

# 如果不使用系统 Node.js，则检查本地是否已有指定版本的 Node.js
if [ "$USE_SYSTEM_NODE" = false ]; then
    if [ ! -d "${NODE_DIR}" ]; then
        print_info "Node.js ${BUNDLED_NODE_VERSION} 未在当前目录找到，正在下载..."
        cd ${CURRENT_DIR}
        mkdir -p ${NODE_ZIP_DIR}
        cd ${NODE_ZIP_DIR}
        if ! curl -O https://nodejs.org/dist/${BUNDLED_NODE_VERSION}/node-${BUNDLED_NODE_VERSION}-${OS}-x64.tar.gz; then
            print_error "下载 Node.js 失败。"
            exit 1
        fi

        mkdir -p ${NODE_DIR}
        if ! tar -xzf node-${BUNDLED_NODE_VERSION}-${OS}-x64.tar.gz -C ${NODE_DIR} --strip-components=1; then
            print_error "解压 Node.js 失败。"
            exit 1
        fi
        cd ..
        print_info "Node.js ${BUNDLED_NODE_VERSION} 安装完成。"
    else
        print_info "使用当前目录下的 Node.js ${BUNDLED_NODE_VERSION}"
    fi
    
    # 设置环境变量使用下载的 Node.js
    export PATH=${NODE_DIR}/bin:${PATH}
fi

# 下载项目文件
if [ ! -d "${PROJECT_DIR}" ]; then
    print_info "下载项目文件..."
    if ! curl -L ${PROJECT_ZIP_URL} -o project.zip; then
        print_error "下载项目文件失败。"
        exit 1
    fi
    if ! unzip -q project.zip; then
        print_error "解压项目文件失败。"
        exit 1
    fi
    print_info "项目文件下载并解压完成。"
else
    print_info "项目目录已存在。"
fi

cd $PROJECT_DIR

print_info "安装依赖..."
if ! npm install; then
    print_warning "安装依赖失败，尝试重新安装..."
    npm install
fi

echo "=================================================="
if [ "$COMMAND" == "start" ]; then
    print_info "尝试启动项目..."
    npm start || (print_warning "启动失败，尝试重新安装依赖..." && npm install && npm start)
elif [ "$COMMAND" == "dev" ]; then
    print_info "尝试以开发模式启动项目..."
    npm run dev || (print_warning "启动失败，尝试重新安装依赖..." && npm install && npm run dev)
else
    print_info "安装完成！"
    echo
    echo "启动指令："
    echo "  - 要启动项目，请运行：'bash install.sh start'"
    echo "  - 要以开发模式启动项目，请运行：'bash install.sh dev'"
    echo
fi
echo "=================================================="