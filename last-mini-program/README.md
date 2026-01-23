# 出行必带小程序

这是出行必带物品查验系统的微信小程序版本，将前端 check-vue 项目的功能移植到了微信小程序平台。

## 功能特性

### 已实现功能

1. **用户认证系统**
   - 用户登录/注册
   - 用户信息管理
   - 登录状态管理

2. **行程管理系统**
   - 行程列表查看
   - 创建新行程
   - 行程详情查看
   - 行程筛选和搜索

3. **物品清单系统**
   - 物品列表展示
   - 物品分类筛选
   - 物品查验状态更新
   - 查验进度跟踪

4. **个人中心**
   - 个人信息编辑
   - 统计数据展示

5. **统计分析**
   - 行程统计
   - 查验完成率统计

## 项目结构

```
出行必带小程序/
├── app.js                 # 小程序入口文件
├── app.json              # 小程序配置
├── app.wxss              # 全局样式
├── utils/
│   ├── api.js            # API请求工具
│   └── auth.js            # 认证工具函数
├── pages/
│   ├── login/            # 登录页面
│   ├── register/         # 注册页面
│   ├── home/             # 首页
│   ├── trip-list/        # 行程列表
│   ├── trip-create/      # 创建行程
│   ├── trip-detail/      # 行程详情
│   ├── checklist/        # 物品清单
│   ├── profile/          # 个人中心
│   └── statistics/       # 统计分析
└── components/           # 公共组件
```

## 配置说明

### 后端API地址

在 `utils/api.js` 中配置后端API地址：

```javascript
const BASE_URL = 'http://localhost:8080'; // 修改为实际的后端地址
```

### 小程序配置

在 `app.json` 中配置小程序的基本信息和页面路由。

### ⚠️ 重要：开发环境配置

**必须在微信开发者工具中启用"不校验合法域名"选项，否则无法连接本地后端！**

配置步骤：
1. 打开微信开发者工具
2. 点击右上角的 **详情** 按钮
3. 在 **本地设置** 选项卡中
4. ✅ **勾选 "不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书"**
5. 重新编译运行小程序

### 生产环境配置

如果要发布小程序，需要在微信公众平台配置合法域名：
1. 登录微信公众平台：https://mp.weixin.qq.com/
2. 进入 **开发** -> **开发管理** -> **开发设置**
3. 在 **服务器域名** -> **request合法域名** 中添加你的后端API地址（必须是HTTPS）

## 前后端联调

### 1. 启动后端服务

后端项目位于 `Check` 目录，启动后端服务：

```bash
cd Check
mvn spring-boot:run
```

后端服务默认运行在 `http://localhost:8080`

**验证后端是否启动成功**：
- 访问 http://localhost:8080/doc.html 查看API文档
- 或在浏览器中测试：http://localhost:8080/api/users/page?pageNum=1&pageSize=10

### 2. 配置小程序开发环境

**⚠️ 这是关键步骤，必须完成！**

1. 使用微信开发者工具打开 `出行必带小程序` 目录
2. 点击右上角的 **详情** 按钮
3. 在 **本地设置** 选项卡中
4. ✅ **勾选 "不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书"**
5. 点击 **编译** 按钮重新编译

### 3. 启动小程序

1. 确保后端服务已启动（步骤1）
2. 确保已勾选"不校验合法域名"（步骤2）
3. 在微信开发者工具中点击 **编译** 运行小程序
4. 测试登录功能

### 4. 验证连接

如果还有连接问题，检查：
- [ ] 后端服务是否真的在运行（访问 http://localhost:8080/doc.html）
- [ ] 开发者工具中"不校验合法域名"是否已勾选
- [ ] `utils/api.js` 中的 BASE_URL 是否正确
- [ ] 控制台是否有其他错误信息

## 功能对比

与 check-vue 前端项目的功能对应关系：

| Vue 页面 | 小程序页面 | 功能 |
|---------|----------|------|
| Login.vue | pages/login/ | 用户登录 |
| Register.vue | pages/register/ | 用户注册 |
| Home.vue | pages/home/ | 首页 |
| TripList.vue | pages/trip-list/ | 行程列表 |
| TripCreate.vue | pages/trip-create/ | 创建行程 |
| TripDetail.vue | pages/trip-detail/ | 行程详情 |
| Checklist.vue | pages/checklist/ | 物品清单 |
| Profile.vue | pages/profile/ | 个人中心 |
| Statistics.vue | pages/statistics/ | 统计分析 |

## API接口

小程序使用与 check-vue 相同的后端API接口，API请求工具封装在 `utils/api.js` 中，包括：

- `userApi` - 用户相关API
- `tripApi` - 行程相关API
- `itemApi` - 物品相关API
- `checkHistoryApi` - 查验历史相关API
- `itemOverviewApi` - 物品总览相关API

## 注意事项

1. **域名配置**：小程序需要在微信公众平台配置合法域名才能访问后端API
2. **HTTPS要求**：正式环境需要使用HTTPS协议
3. **数据存储**：使用微信小程序的本地存储API（wx.setStorageSync / wx.getStorageSync）
4. **网络请求**：使用wx.request封装，支持自动添加token等认证信息

## 开发说明

### 本地开发

1. 启动后端服务（Check项目）
2. 使用微信开发者工具打开小程序项目
3. 在开发者工具中启用"不校验合法域名"选项
4. 配置后端API地址为本地地址（如：http://localhost:8080）

### 部署说明

1. 将后端服务部署到服务器
2. 配置小程序的合法域名指向后端服务器
3. 修改 `utils/api.js` 中的 `BASE_URL` 为生产环境地址
4. 使用微信开发者工具上传代码并提交审核


##  AI Builder API
WeChat Mini-program 내에서 AI 빌더 기능을 사용하기 위한 유틸리티 명세입니다.

### \utils/builderApi.js\
- \createIdea(userId, data)\: 아이디어, 테마, 톤을 전송하여 생성을 요청합니다.
- \getPreview(id)\: 생성된 미리보기 데이터(HTML/CSS)를 조회합니다.
- \deploy(id, platform)\: 특정 플랫폼(vercel 등)으로 배포를 요청합니다.

### 페이지 구조 (\pages/builder/\)
- Input Step: 아이디어 입력 및 옵션 선택
- Preview Step: 생성 결과(Code/Visual) 확인
- Success Step: 배포 완료 링크 제공
