# 出行必带小程序 - 完整部署和使用指南

## 项目名称

**出行必带小程序（Travelkit）**：一款面向个人和小团队的智能出行物品管理与查验工具。

## 📋 目录

- [项目名称](#项目名称)
- [项目简介](#项目简介)
- [运行环境](#运行环境)
- [依赖库及安装命令](#依赖库及安装命令)
- [详细运行步骤](#详细运行步骤)
- [数据库配置](#数据库配置)
- [后端配置与启动](#后端配置与启动)
- [小程序配置与启动](#小程序配置与启动)
- [功能使用说明](#功能使用说明)
- [常见问题](#常见问题)
- [技术支持](#技术支持)

---

## 📖 项目简介

**出行必带**是一款智能出行物品管理小程序，帮助用户：
- 📝 创建和管理出行行程
- ✅ 智能生成物品清单
- 🔍 实时查验物品携带情况
- 👥 支持多人协作行程
- 📊 查看出行统计信息

### 技术栈

- **后端**：Spring Boot + MyBatis + MySQL
- **前端**：微信小程序
- **数据库**：MySQL 5.7+

---

## 🔧 运行环境

### 必需软件

1. **MySQL 5.7+** 或 **MySQL 8.0+**
   - 下载地址：https://dev.mysql.com/downloads/mysql/
   - 确保MySQL服务已启动

2. **JDK 1.8+** 或 **JDK 11+**
   - 下载地址：https://www.oracle.com/java/technologies/downloads/
   - 配置JAVA_HOME环境变量

3. **Maven 3.6+**
   - 下载地址：https://maven.apache.org/download.cgi
   - 配置MAVEN_HOME环境变量

4. **微信开发者工具**
   - 下载地址：https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html
   - 使用最新稳定版本

5. **Node.js 16+（可选）**
   - 仅在需要使用额外前端构建工具或脚本时使用，本项目主流程不强依赖

6. **Python 3.8+（可选）**
   - 可用于后续扩展的数据分析或脚本处理，本项目当前版本未强制依赖

### 环境检查

#### 检查MySQL
```bash
mysql --version
# 应该显示类似：mysql  Ver 8.0.xx for Win64 on x86_64
```

#### 检查Java
```bash
java -version
# 应该显示类似：java version "1.8.0_xxx" 或 "11.0.x"
```

#### 检查Maven
```bash
mvn -version
# 应该显示Maven版本和Java版本信息
```

---

## 📦 依赖库及安装命令

本项目分为 **后端（Spring Boot）** 和 **微信小程序前端** 两部分。

### 后端依赖（通过 Maven 管理）

主要依赖包括（节选）：

- `spring-boot-starter-web`：Web 与 REST 接口支持
- `spring-boot-starter-test`：单元测试
- `mysql-connector-java`：MySQL 驱动
- `mybatis-spring-boot-starter`：MyBatis 持久层框架
- `druid-spring-boot-starter`：Druid 数据源连接池
- `lombok`：简化实体类代码
- `knife4j-spring-boot-starter`：API 文档（Swagger 增强）

所有依赖由 Maven 自动下载，无需手动逐个安装。

**安装命令：**

```bash
cd new-backend
# 下载依赖并编译
mvn clean install -DskipTests
```

如果只是运行项目，也可以直接：

```bash
cd new-backend
mvn dependency:resolve
```

### 小程序前端依赖

本项目使用 **原生微信小程序** 技术栈：

- 不依赖 npm 包管理
- 不需要 `npm install`
- 所有代码直接由微信开发者工具编译运行

只需安装并使用微信开发者工具打开 `last-mini-program` 目录即可。

---

## 🧭 详细运行步骤

本节为评委提供一个 **从零到跑通项目** 的完整流程，总结前文所有关键步骤。

### 步骤 1：安装基础环境

1. 安装并启动 **MySQL 5.7+ / 8.0+**
2. 安装 **JDK 8+ / 11+ / 17**，配置 `JAVA_HOME`
3. 安装 **Maven 3.6+**
4. 安装 **微信开发者工具**
5. （可选）安装 Node.js 16+、Python 3.8+

### 步骤 2：导入数据库（使用 123.sql）

1. 打开命令行/终端，执行：
   ```bash
   mysql -u root -p
   ```
2. 在 MySQL 中创建数据库：
   ```sql
   CREATE DATABASE IF NOT EXISTS check
     DEFAULT CHARACTER SET utf8mb4
     COLLATE utf8mb4_unicode_ci;
   EXIT;
   ```
3. 在命令行中导入 `123.sql`：
   ```bash
   mysql -u root -p check < new-backend/sql/123.sql
   ```
4. 可选：用客户端工具（Navicat / Workbench）导入同一个 `123.sql` 文件。

### 步骤 3：配置后端数据库连接

1. 打开文件：`new-backend/src/main/resources/application.yml`
2. 根据本机 MySQL 配置修改：
   ```yaml
   spring:
     datasource:
       druid:
         username: root          # 修改为实际用户名
         password: 你的MySQL密码   # 修改为实际密码
         driver-class-name: com.mysql.cj.jdbc.Driver
         url: jdbc:mysql://localhost:3306/check?serverTimezone=Asia/Shanghai&useUnicode=true&characterEncoding=utf8
   ```
3. 保存文件。

### 步骤 4：下载依赖并启动后端

1. 打开命令行，进入后端目录：
   ```bash
   cd new-backend
   ```
2. 下载依赖并编译（首次必做）：
   ```bash
   mvn clean install -DskipTests
   ```
3. 启动后端服务：
   ```bash
   mvn spring-boot:run
   ```
4. 等待控制台出现：
   - `Started CheckApplication ...`
   - `Tomcat started on port(s): 8080`  
   表示后端已在 `http://localhost:8080` 正常运行。
5. 在浏览器访问：`http://localhost:8080/doc.html`  
   若能打开接口文档，说明后端运行正常。

### 步骤 5：配置小程序 API 地址

1. 打开文件：`last-mini-program/utils/api.js`
2. 确认或修改为：
   ```javascript
   const BASE_URL = 'http://localhost:8080'; // 后端API地址
   ```
3. 如果后端不是跑在本机或端口不是 8080，请相应修改为实际地址。

### 步骤 6：配置微信开发者工具

1. 打开 **微信开发者工具**
2. 点击左上角 **“导入项目”**：
   - 项目目录：选择 `last-mini-program`
   - AppID：使用自己的测试号或正式小程序 AppID
3. 导入成功后，点击右上角 **“详情”**：
   - 在 **“本地设置”** 选项卡中，勾选：  
     **✅ 不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书**
4. 点击工具栏 **“编译”** 按钮，等待小程序在模拟器中启动。

### 步骤 7：联调与登录测试

1. 确认后端控制台无报错，端口 `8080` 处于监听状态。
2. 在微信开发者工具中：
   - 打开 **“调试器” → “Network”** 面板
   - 返回到登录页，勾选协议，点击 **“微信授权登录”** 或 **“游客模式”**
3. 观察 Network 面板：
   - 确认请求地址为：`http://localhost:8080/api/...`
   - 返回 HTTP 200 且有业务数据
4. 登录成功后，进入首页和行程列表，验证数据展示是否正常。

至此，评委即可完整跑通本项目（数据库 + 后端 + 小程序）全流程。

---

## 💾 数据库配置

### 第一步：导入数据库

#### 方法一：使用命令行（推荐）

1. **打开命令行（Windows）或终端（Mac/Linux）**

2. **登录MySQL**
   ```bash
   mysql -u root -p
   ```
   输入MySQL密码

3. **创建数据库（如果不存在）**
   ```sql
   CREATE DATABASE IF NOT EXISTS check DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

4. **退出MySQL**
   ```sql
   exit;
   ```

5. **导入数据库文件**
   ```bash
   mysql -u root -p check < 123.sql
   ```
   输入MySQL密码，等待导入完成

#### 方法二：使用MySQL客户端工具

1. **打开Navicat、phpMyAdmin或MySQL Workbench**

2. **连接到MySQL服务器**

3. **创建数据库**
   - 数据库名：`check`
   - 字符集：`utf8mb4`
   - 排序规则：`utf8mb4_unicode_ci`

4. **导入SQL文件**
   - 选择数据库 `check`
   - 点击"导入"或"Execute SQL File"
   - 选择 `123.sql` 文件
   - 执行导入

### 第二步：验证数据库

执行以下SQL验证导入是否成功：

```sql
USE check;

-- 查看所有表
SHOW TABLES;

-- 应该看到13个表：
-- users, trips, items, item_categories, item_overview,
-- trip_templates, template_items, cooperative_trips,
-- cooperative_trip_members, cooperative_items,
-- cooperative_item_checks, cooperative_trip_invites, check_history

-- 查看用户数量
SELECT COUNT(*) FROM users;

-- 查看行程数量
SELECT COUNT(*) FROM trips;
```

### 数据库配置信息

- **数据库名**：`check`
- **字符集**：`utf8mb4`
- **端口**：`3306`（默认）
- **用户名**：`root`（根据实际情况修改）
- **密码**：需要根据实际情况配置

---

## 🚀 后端配置与启动

### 第一步：配置数据库连接

1. **打开后端配置文件**
   ```
   new-backend/src/main/resources/application.yml
   ```

2. **修改数据库配置**
   ```yaml
   spring:
     datasource:
       druid:
         username: root          # 修改为您的MySQL用户名
         password: 您的MySQL密码   # 修改为您的MySQL密码
         driver-class-name: com.mysql.cj.jdbc.Driver
         url: jdbc:mysql://localhost:3306/check?serverTimezone=Asia/Shanghai&useUnicode=true&characterEncoding=utf8
   ```

   **重要**：请将 `password` 修改为您实际的MySQL密码！

### 第二步：启动后端服务

#### 方法一：使用Maven命令（推荐）

1. **打开命令行，进入后端项目目录**
   ```bash
   cd new-backend
   ```

2. **启动Spring Boot应用**
   ```bash
   mvn spring-boot:run
   ```

3. **等待启动完成**
   - 看到 `Started CheckApplication in X.XXX seconds` 表示启动成功
   - 后端服务运行在：`http://localhost:8080`

#### 方法二：使用IDE（IntelliJ IDEA / Eclipse）

1. **导入项目**
   - 打开IDE，选择 `File` -> `Open`
   - 选择 `new-backend` 目录

2. **等待Maven依赖下载完成**

3. **运行主类**
   - 找到 `com.example.check.CheckApplication.java`
   - 右键 -> `Run 'CheckApplication'`

### 第三步：验证后端服务

1. **访问API文档**
   - 打开浏览器访问：`http://localhost:8080/doc.html`
   - 应该能看到Knife4j API文档界面

2. **测试API接口**
   ```bash
   # 测试用户列表接口
   curl http://localhost:8080/api/users/page?pageNum=1&pageSize=10
   ```

3. **查看启动日志**
   - 确认没有错误信息
   - 确认看到 `Tomcat started on port(s): 8080`

### 后端配置说明

- **服务端口**：`8080`
- **API基础路径**：`/api`
- **API文档**：`http://localhost:8080/doc.html`

---

## 📱 小程序配置与启动

### 第一步：配置API地址

1. **打开小程序API配置文件**
   ```
   last-mini-program/utils/api.js
   ```

2. **确认BASE_URL配置**
   ```javascript
   // 第4行，确保BASE_URL为：
   const BASE_URL = 'http://localhost:8080';
   ```

   **注意**：如果后端运行在其他地址，请相应修改。

### 第二步：配置微信开发者工具

1. **打开微信开发者工具**

2. **导入项目**
   - 点击"+" -> "导入项目"
   - 项目目录选择：`last-mini-program`
   - AppID：选择"测试号"或使用您的小程序AppID
   - 项目名称：出行必带

3. **重要配置 - 本地设置**
   - 点击右上角 **"详情"** 按钮
   - 切换到 **"本地设置"** 选项卡
   - ✅ **勾选** "不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书"
   
   **这一步非常重要！** 不勾选会导致无法连接本地后端服务。

### 第三步：启动小程序

1. **编译项目**
   - 点击工具栏的 **"编译"** 按钮
   - 或按快捷键 `Ctrl + B`（Windows）或 `Cmd + B`（Mac）

2. **查看控制台**
   - 打开 **"调试器"** -> **"Console"** 查看日志
   - 确认没有红色错误信息

3. **测试网络请求**
   - 打开 **"调试器"** -> **"Network"**
   - 尝试登录，查看是否有网络请求发出

### 小程序项目结构

```
last-mini-program/
├── app.js              # 小程序入口文件
├── app.json            # 小程序配置文件
├── app.wxss           # 全局样式
├── pages/             # 页面目录
│   ├── login/         # 登录页面
│   ├── home/          # 首页
│   ├── trip-list/     # 行程列表
│   └── ...
├── utils/             # 工具函数
│   ├── api.js         # API接口封装
│   └── auth.js        # 认证工具
└── components/        # 组件目录
```

---

## 🎯 功能使用说明

### 1. 用户登录

#### 微信登录
1. 打开小程序，进入登录页面
2. 勾选"已阅读并同意《用户协议》和《隐私政策》"
3. 点击"微信授权登录"
4. 系统会自动获取微信登录凭证并完成登录

#### 游客模式
1. 在登录页面点击"游客模式"
2. 无需授权，直接进入系统
3. 功能受限，建议使用微信登录

### 2. 创建行程

1. **进入行程列表**
   - 点击底部导航栏"行程"
   - 或从首页进入

2. **创建新行程**
   - 点击"+"或"创建行程"按钮
   - 填写行程信息：
     - 行程名称
     - 目的地
     - 开始日期
     - 结束日期
     - 出行人数
     - 行程类型
     - 预算范围
     - 特殊需求

3. **选择物品清单**
   - 可以从模板创建
   - 可以手动添加物品
   - 可以从物品总览选择

### 3. 物品管理

#### 添加物品
1. 进入行程详情页
2. 点击"添加物品"
3. 选择分类或从物品总览选择
4. 填写物品名称和备注
5. 设置优先级（高/中/低）

#### 物品分类
- 证件类：身份证、护照、签证等
- 衣物类：衣服、鞋子、配饰等
- 电子设备：手机、充电器、相机等
- 洗漱用品：牙刷、牙膏、洗面奶等
- 药品类：常用药品、急救用品
- 食品类：零食、水、方便食品
- 其他：其他物品

### 4. 查验功能

#### 开始查验
1. 进入行程详情页
2. 点击"开始查验"按钮
3. 系统进入查验模式

#### 查验物品
1. 在查验页面，逐个检查物品
2. 点击物品右侧的复选框标记为"已携带"
3. 可以跳过不需要的物品
4. 实时查看查验进度

#### 完成查验
1. 查验完成后，点击"完成查验"
2. 查看查验结果统计
3. 可以查看查验历史记录

### 5. 合作行程

#### 创建合作行程
1. 在行程列表点击"创建合作行程"
2. 填写行程信息
3. 创建后可以邀请其他用户

#### 邀请成员
1. 进入合作行程详情
2. 点击"邀请成员"
3. 生成邀请链接或短码
4. 分享给其他用户

#### 加入合作行程
1. 通过邀请链接或短码加入
2. 或扫描邀请二维码
3. 加入后可以查看和编辑行程物品

#### 协作查验
- 每个成员独立查验自己的物品
- 实时查看其他成员的查验进度
- 支持成员间物品分配

### 6. 行程模板

#### 使用模板
1. 创建行程时选择"从模板创建"
2. 浏览公开模板
3. 选择适合的模板
4. 自动生成行程和物品清单

#### 创建模板
1. 进入"行程模板"页面
2. 点击"创建模板"
3. 填写模板信息
4. 添加物品清单
5. 选择是否公开

### 7. 个人中心

#### 查看个人信息
- 头像、昵称、性别、生日
- 个人简介
- 用户身份（普通用户/管理员）

#### 编辑个人资料
1. 进入"我的"页面
2. 点击"编辑资料"
3. 修改个人信息
4. 保存更改

#### 查看统计信息
- 总行程数
- 已完成行程数
- 总出行天数
- 查验完成率

### 8. 管理员功能

#### 用户管理
- 查看所有用户列表
- 禁用/启用用户
- 修改用户身份

#### 模板审核
- 查看待审核模板
- 审核通过/拒绝模板
- 查看审核原因

---

## ❓ 常见问题

### 数据库相关问题

#### Q1: 导入数据库时提示"Access denied"
**A:** 检查MySQL用户名和密码是否正确，确保有创建数据库的权限。

#### Q2: 导入后表是空的
**A:** 检查SQL文件是否完整，确保导入过程中没有错误。可以查看MySQL错误日志。

#### Q3: 字符集乱码
**A:** 确保数据库和表都使用 `utf8mb4` 字符集。

### 后端相关问题

#### Q1: 后端启动失败，提示数据库连接错误
**A:** 
1. 检查MySQL服务是否启动
2. 检查 `application.yml` 中的数据库配置是否正确
3. 检查数据库 `check` 是否存在
4. 检查用户名和密码是否正确

#### Q2: 端口8080被占用
**A:**
1. 修改 `application.yml` 中的 `server.port` 为其他端口（如8081）
2. 同时修改小程序 `api.js` 中的 `BASE_URL`

#### Q3: Maven依赖下载失败
**A:**
1. 检查网络连接
2. 配置Maven镜像源（阿里云镜像）
3. 清理Maven缓存：`mvn clean`

### 小程序相关问题

#### Q1: 小程序无法连接后端，提示"url not in domain list"
**A:**
1. 确认已勾选"不校验合法域名"（在开发者工具 -> 详情 -> 本地设置）
2. 确认 `api.js` 中的 `BASE_URL` 为 `http://localhost:8080`
3. 完全关闭开发者工具后重新打开

#### Q2: 登录失败，提示"没有授权"
**A:**
- 这是正常的，新版本微信小程序不需要用户信息授权
- 只需同意用户协议即可登录

#### Q3: 页面显示空白或报错
**A:**
1. 查看控制台错误信息
2. 检查后端服务是否正常运行
3. 检查网络请求是否成功
4. 尝试重新编译小程序

#### Q4: 无法切换账号测试
**A:**
1. 在登录页面会显示当前登录账号
2. 点击"切换账号"按钮
3. 或在"我的"页面点击"退出登录"

### 功能相关问题

#### Q1: 如何测试不同账号？
**A:**
1. 在登录页面点击"切换账号"
2. 或在微信开发者工具中清除缓存
3. 重新登录使用其他微信账号

#### Q2: 如何重置数据库？
**A:**
```bash
# 重新导入SQL文件
mysql -u root -p check < 123.sql
```

#### Q3: 如何查看API文档？
**A:**
- 启动后端服务后，访问：`http://localhost:8080/doc.html`

---

## 🔍 调试技巧

### 后端调试

1. **查看日志**
   - 后端启动时会在控制台输出日志
   - 查看错误信息和堆栈跟踪

2. **测试API**
   - 使用Postman或curl测试API
   - 访问 `http://localhost:8080/doc.html` 查看接口文档

3. **数据库查询**
   - 使用MySQL客户端查看数据
   - 检查数据是否正确

### 小程序调试

1. **查看控制台**
   - 打开开发者工具的"调试器" -> "Console"
   - 查看JavaScript错误和日志

2. **查看网络请求**
   - 打开"调试器" -> "Network"
   - 查看请求URL、参数、响应数据

3. **查看存储**
   - 打开"调试器" -> "Storage"
   - 查看本地存储的用户信息和token

---

## 📞 技术支持

### 项目结构

```
Travelkit/
├── new-backend/          # 后端项目
│   ├── src/             # 源代码
│   ├── pom.xml          # Maven配置
│   └── sql/             # SQL脚本
│       └── 123.sql      # 完整数据库脚本
└── last-mini-program/   # 小程序项目
    ├── pages/           # 页面
    ├── utils/           # 工具函数
    └── app.json         # 小程序配置
```

### 重要文件说明

- **数据库脚本**：`new-backend/sql/123.sql` - 包含完整的数据库结构和数据
- **后端配置**：`new-backend/src/main/resources/application.yml` - 数据库连接配置
- **API配置**：`last-mini-program/utils/api.js` - 后端API地址配置
- **小程序配置**：`last-mini-program/app.json` - 小程序页面和tabBar配置

### 快速检查清单

在启动项目前，请确认：

- [ ] MySQL服务已启动
- [ ] 数据库 `check` 已创建并导入数据
- [ ] `application.yml` 中数据库密码已修改
- [ ] 后端服务已启动（http://localhost:8080）
- [ ] 微信开发者工具中已勾选"不校验合法域名"
- [ ] `api.js` 中 `BASE_URL` 配置正确

---

## 📝 版本信息

- **数据库版本**：MySQL 5.7+
- **后端框架**：Spring Boot 2.x
- **小程序基础库**：2.10.4+
- **文档版本**：v1.0

---

## 🎉 开始使用

按照以上步骤配置完成后，您就可以开始使用"出行必带"小程序了！

1. ✅ 导入数据库 `123.sql`
2. ✅ 配置并启动后端服务
3. ✅ 配置并启动小程序
4. ✅ 使用微信登录或游客模式登录
5. ✅ 创建行程，开始使用！

**祝您使用愉快！** 🚀

---

*如有问题，请查看"常见问题"部分或检查日志信息。*

