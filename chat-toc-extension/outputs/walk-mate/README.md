# Walk Mate (MVP Week 1)

Mobile web app for generating personalized walking loops. "Choice Fatigue" Solver.

## 🚀 Quick Start

1. **Navigate to project:**
   ```bash
   cd outputs/walk-mate
   ```

2. **Setup Environment:**
   - Copy `.env.local` to `.env.local` (already there)
   - Add your keys:
     - `NEXT_PUBLIC_MAPBOX_TOKEN`: From Mapbox Console
     - `GRAPHHOPPER_API_KEY`: From GraphHopper Dashboard

3. **Install & Run:**
   ```bash
   npm install
   npm run dev
   ```

4. **Test on Mobile:**
   - Ensure your phone and PC are on the same Wi-Fi.
   - Access via `http://YOUR_PC_IP:3000`.
   - Allow "Location Access" when prompted.

## 📱 Features (Week 1)
- **Instant Loop:** Generates a round-trip walking path starting from your current location.
- **Distance Control:** Slider to choose between 1km - 10km.
- **Map Visualization:** Blue polyline on beautiful Mapbox terrain.
- **Reroll:** Don't like the path? Click again to get a fresh random loop.

## 🛠 Tech Stack
- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **Map:** Mapbox GL JS
- **Routing Engine:** GraphHopper API (via Next.js Proxy)

## Troubleshooting

### 1) 지도(맵)가 안 뜹니다
- `.env.local`에 `NEXT_PUBLIC_MAPBOX_TOKEN`이 필요합니다.
- 토큰이 없으면 앱이 크래시하지 않고 "Configuration Required" 오버레이가 표시됩니다.

### 2) 루프 생성이 401/403 에러입니다
- `GRAPHHOPPER_API_KEY`가 잘못되었거나 누락된 경우입니다.
- `.env.local`을 확인하고 서버 재시작하세요.

### 3) 위치가 안 잡힙니다
- 모바일 브라우저에서 위치 권한을 허용해야 합니다.
- 사파리/크롬에서 주소창 권한 설정을 확인하세요.

