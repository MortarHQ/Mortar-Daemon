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

# 设置错误退出函数
exit_on_error() {
    print_error "$1"
    exit 1
}

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
    exit_on_error "不支持的操作系统。请尝试手动安装！"
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
                sudo apt-get install $tool -y || exit_on_error "安装 $tool 失败"
            elif [ -f /etc/redhat-release ]; then
                sudo yum install $tool -y || exit_on_error "安装 $tool 失败"
            else
                exit_on_error "不支持的 Linux 发行版。请手动安装 $tool。"
            fi
            ;;
        Darwin*)
            brew install $tool || exit_on_error "安装 $tool 失败"
            ;;
        *)
            exit_on_error "不支持的操作系统。请手动安装 $tool。"
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
        cd ${CURRENT_DIR} || exit_on_error "无法切换到当前目录"
        mkdir -p ${NODE_ZIP_DIR} || exit_on_error "创建 Node.js 目录失败"
        cd ${NODE_ZIP_DIR} || exit_on_error "无法进入 Node.js 目录"
        
        if ! curl -O https://nodejs.org/dist/${BUNDLED_NODE_VERSION}/node-${BUNDLED_NODE_VERSION}-${OS}-x64.tar.gz; then
            exit_on_error "下载 Node.js 失败"
        fi

        mkdir -p ${NODE_DIR} || exit_on_error "创建 Node.js 解压目录失败"
        if ! tar -xzf node-${BUNDLED_NODE_VERSION}-${OS}-x64.tar.gz -C ${NODE_DIR} --strip-components=1; then
            exit_on_error "解压 Node.js 失败"
        fi
        
        # 清理下载的压缩包
        rm -f node-${BUNDLED_NODE_VERSION}-${OS}-x64.tar.gz || print_warning "清理 Node.js 安装包失败，但将继续执行"
        
        cd ${CURRENT_DIR} || exit_on_error "无法返回原始目录"
        print_info "Node.js ${BUNDLED_NODE_VERSION} 安装完成"
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
        exit_on_error "下载项目文件失败"
    fi
    if ! unzip -q project.zip; then
        exit_on_error "解压项目文件失败"
    fi
    rm -f project.zip || print_warning "清理项目安装包失败，但将继续执行"
    print_info "项目文件下载并解压完成"
else
    print_info "项目目录已存在"
fi

cd $PROJECT_DIR || exit_on_error "无法进入项目目录"

print_info "安装依赖..."
if ! npm install; then
    print_warning "安装依赖失败，尝试重新安装..."
    if ! npm install; then
        exit_on_error "依赖安装失败，终止执行"
    fi
fi

echo "=================================================="
if [ "$COMMAND" == "start" ]; then
    print_info "尝试启动项目..."
    if ! npm start; then
        print_warning "启动失败，尝试重新安装依赖..."
        if ! npm install; then
            exit_on_error "依赖重新安装失败，终止执行"
        fi
        if ! npm start; then
            exit_on_error "项目启动失败，请检查错误日志"
        fi
    fi
elif [ "$COMMAND" == "dev" ]; then
    print_info "尝试以开发模式启动项目..."
    if ! npm run dev; then
        print_warning "启动失败，尝试重新安装依赖..."
        if ! npm install; then
            exit_on_error "依赖重新安装失败，终止执行"
        fi
        if ! npm run dev; then
            exit_on_error "项目开发模式启动失败，请检查错误日志"
        fi
    fi
else
    print_info "安装完成！"
    echo
    echo "启动指令："
    echo "  - 要启动项目，请运行：'bash install.sh start'"
    echo "  - 要以开发模式启动项目，请运行：'bash install.sh dev'"
    echo
fi
echo "=================================================="