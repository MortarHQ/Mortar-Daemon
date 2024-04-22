#!/bin/bash

# 接收参数
COMMAND=$1

# 安全性提醒
echo "此脚本需要安装 curl 和 unzip。请确保你已经安装了这些工具，或者有足够的权限来安装它们。"

# 系统检测
case "$(uname -s)" in
Linux*) OS=linux ;;
Darwin*) OS=darwin ;;
*)
    echo "不支持的操作系统。"
    echo "请尝试手动安装！"
    exit 1
    ;;
esac

# 检测并安装必要的工具：curl 和 unzip
for tool in curl unzip; do
    if ! command -v $tool &>/dev/null; then
        echo "$tool 未安装。"
        # 跨平台支持
        case "$(uname -s)" in
        Linux*)
            if [ -f /etc/debian_version ]; then
                sudo apt-get install $tool -y
            elif [ -f /etc/redhat-release ]; then
                sudo yum install $tool -y
            else
                echo "不支持的 Linux 发行版。请手动安装 $tool。"
                exit 1
            fi
            ;;
        Darwin*)
            brew install $tool
            ;;
        *)
            echo "不支持的操作系统。请手动安装 $tool。"
            exit 1
            ;;
        esac
    fi
done

CURRENT_DIR=${PWD}

NODE_VERSION=v20.11.0
NODE_ZIP_DIR=${CURRENT_DIR}/node_${NODE_VERSION}
NODE_DIR=${NODE_ZIP_DIR}/node-${NODE_VERSION}-${OS}-x64

PROJECT_ZIP_URL="https://github.com/MortarHQ/Mortar-Daemon/archive/refs/heads/master.zip"
PROJECT_DIR=${CURRENT_DIR}/Mortar-Daemon-master

export PATH=${NODE_DIR}/bin:${PATH}

echo "Node.js目录：${NODE_DIR}"

# 检测当前目录是否拥有指定版本的 Node.js
echo ${NODE_DIR}
if [ ! -d "${NODE_DIR}" ]; then
    echo "Node.js $NODE_VERSION 未在当前目录找到，正在下载..."
    cd ${CURRENT_DIR}
    mkdir ${NODE_ZIP_DIR}
    cd ${NODE_ZIP_DIR}
    if ! curl -O https://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}-${OS}-x64.tar.gz; then
        echo "下载 Node.js 失败。"
        exit 1
    fi

    mkdir ${NODE_DIR} -p
    if ! tar -xzf node-${NODE_VERSION}-${OS}-x64.tar.gz -C ${NODE_DIR} --strip-components=1; then
        echo "解压 Node.js 失败。"
        exit 1
    fi
    cd ..
    echo "Node.js ${NODE_VERSION} 安装完成。"
else
    echo "使用当前目录下的 Node.js ${NODE_VERSION}"
fi

if [ ! -d "${PROJECT_DIR}" ]; then
    echo "下载项目文件..."
    if ! curl -L ${PROJECT_ZIP_URL} -o project.zip; then
        echo "下载项目文件失败。"
        exit 1
    fi
    if ! unzip project.zip; then
        echo "解压项目文件失败。"
        exit 1
    fi
    echo "项目文件下载并解压完成。"
else
    echo "项目目录已存在。"
fi

cd $PROJECT_DIR

echo "使用 Node.js $NODE_VERSION 安装依赖..."
if ! npm install; then
    echo "安装依赖失败，尝试重新安装..."
    npm install
fi

echo "=================================================="
if [ "$COMMAND" == "start" ]; then
    echo "尝试启动项目..."
    npm start || (echo "启动失败，尝试重新安装依赖..." && npm install && npm start)
elif [ "$COMMAND" == "dev" ]; then
    echo "尝试以开发模式启动项目..."
    npm run dev || (echo "启动失败，尝试重新安装依赖..." && npm install && npm run dev)
else
    echo "安装完成！"
    echo
    echo "启动指令："
    echo "  - 要启动项目，请运行：'bash install.sh start'"
    echo "  - 要以开发模式启动项目，请运行：'bash install.sh dev'"
    echo
fi
echo "=================================================="
