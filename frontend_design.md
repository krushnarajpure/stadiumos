# StadiumOS: Frontend and UI/UX Design Specification
### Enterprise Real-Time Visual Command & Human-Centered AI Specification (FIFA World Cup 2026 Edition)
**Author:** Principal Product Designer & Frontend Architect, Google  
**Version:** 1.0.0  
**Status:** Approved for Implementation  

---

## 1. Frontend Philosophy

StadiumOS adopts a **Material Design 3 (M3)** framework, optimized for high-pressure, real-time enterprise operational environments:

```
+-------------------------------------------------------------------------------------------------+
|                                    FRONTEND PRINCIPLES                                          |
|                                                                                                 |
|   Simple          Real-Time       Minimal         Accessible      Fast            AI-First      |
|   Fewer clicks    SSE/WS feeds    No clutter      WCAG 2.2 AA     Sub-100ms load  Agent status  |
+-------------------------------------------------------------------------------------------------+
```

*   **Simple (Fewer Click Paradigm):** Operational teams do not have time to navigate multiple nested pages. Critical information must be accessible within **two clicks or less** from the primary dashboard view.
*   **Real-Time (Zero-Polling UI):** State changes, density metrics, and medical alerts stream dynamically via WebSockets or Server-Sent Events (SSE). The interface updates in place without requiring browser refreshes.
*   **Minimal (Glassmorphism & Contrast):** Utilizes dark themes, clean lines, and semi-transparent cards to focus attention on critical alarms and real-time map indicators.
*   **Accessible (Inclusive Design):** Complies with WCAG 2.2 AA standards. Enforces distinct high-contrast colors, clear typography sizes, and keyboard navigation configurations for users with accessibility needs.
*   **Fast (Optimized Rendering):** Sub-100ms page transition target. Leveraging React virtualized lists (for long logs streams) and hardware-accelerated canvas renderers (for maps overlays) to prevent visual lag.
*   **AI-First (Agentic Visibility):** The GenAI Copilot and LangGraph multi-agent status indicators are integrated into the primary dashboards, allowing operators to monitor agent reasoning paths and approve tool actions.

---

## 2. User Roles & Interfaces

StadiumOS provides customized interfaces tailored to the tasks and environments of each operational role:

### 1. Fan App (Mobile)
*   **Goal:** Navigate to seat, purchase concession food, view real-time transit status, and query the multilingual AI assistant.
*   **Permissions:** `role:fan`, access only to public endpoints.
*   **Screens:** Ingress Ticket Gate, Interactive Seat Route Map, Concession Menu, Transit Hub schedule, Copilot Chat.
*   **Primary Actions:** Check-in validation scan, purchase hot dog, query "closest wheelchair ramp."

### 2. Volunteer App (Mobile)
*   **Goal:** Check-in for shifts, receive automated task alerts, navigate to incidents, and access the volunteer FAQ database.
*   **Permissions:** `role:volunteer`, `scope:volunteer_read_write`.
*   **Screens:** Shift Dashboard, Active Task Map, Volunteer Handbook RAG chat, Shift Check-in.
*   **Primary Actions:** Confirm task assignment (e.g., "Go to Gate C"), report incident.

### 3. Security Dashboard (Desktop / Mobile)
*   **Goal:** Monitor CCTV edge-CV feeds, track boundary alarms, and dispatch guards to incident coordinates.
*   **Permissions:** `role:security_officer`, `scope:security_read_write`.
*   **Screens:** Live CCTV feed monitor, Sector Heatmaps, Guard Tracker, Incident Triage Console.
*   **Primary Actions:** Deploy guard squad, request signage diversion override, view alarm details.

### 4. Medical Dashboard (Desktop / Mobile)
*   **Goal:** Track mobile responder coordinates, coordinate clinic capacity, and monitor incoming dispatch alerts.
*   **Permissions:** `role:medical_responder`, `scope:medical_read_write`.
*   **Screens:** Active Medical Cases map, Clinic bed occupancy dashboard, Team tracking.
*   **Primary Actions:** Dispatch medical team, update patient triage level (Red/Amber/Green), request route clearance.

### 5. Vendor Dashboard (Tablet / Desktop)
*   **Goal:** Track transaction speeds, concessions inventory metrics, and POS checkout logs.
*   **Permissions:** `role:vendor_manager`, `scope:vendor_read_write`.
*   **Screens:** Concession Inventory Monitor, Real-time Sales ledger, Stock Replenishment planner.
*   **Primary Actions:** Reorder stock, edit digital menu items, assign checkout staff.

### 6. Operations Manager (Operations Command Center - OCC)
*   **Goal:** Monitor global stadium parameters, evaluate ML crowd congestion forecasts, and review safety compliance logs.
*   **Permissions:** `role:ops_manager`, `scope:admin_read_write`.
*   **Screens:** Central OCC Command Map, ML Analytics Engine, Multi-Agent LangGraph Supervisor tracking console.
*   **Primary Actions:** Approve dynamic routing overrides, broadcast emergency evacuation alerts.

### 7. Administrator Dashboard (Desktop)
*   **Goal:** Adjust system limits, manage staff roles and database scopes, upload updated RAG manuals, and audit system logs.
*   **Permissions:** `role:admin`, all system scopes.
*   **Screens:** System settings panel, IAM registry, Database Health dashboard, Vector RAG upload portal.
*   **Primary Actions:** Edit user roles, upload safety PDFs, check database connection latency.

---

## 3. Information Architecture & Navigation

The navigation hierarchy is designed to minimize cognitive load, organizing screens logically:

```
[Login / Auth]
      |
      v
[Global Command Center / Dashboard]
      |
      +---> Live Map (Heatmaps, Gate Statuses, Staff Positions)
      +---> Incident Console (Alarms list, Security events, Medical cases)
      +---> Concessions Hub (POS streams, Inventory stock indicators)
      +---> Transit & Shuttles (Bus loops tracker, City rail times)
      +---> AI Assistant Portal (LangGraph thread execution logs, Chat box)
      +---> Executive Analytics (GNN forecasts, Revenue charts)
      +---> System Configurations (RAG file manager, IAM controls, Settings)
```

---

## 4. Complete Screen List

### 1. Operations Command Center (OCC) Dashboard
*   **Purpose:** Central management interface for the FIFA Match Day Director.
*   **Widgets:** Match State Tracker, Global Ingress Speed Index, Active Incident list, Concessions Status tracker.
*   **Charts:** Ingress rates (Area Chart), Concourse Crowding trends (Multi-line Chart).
*   **AI Components:** LangGraph Task Proposals (displays proposed actions with confidence ratings and explanation buttons).
*   **APIs Used:** `GET /api/v1/crowd/density`, `GET /api/v1/predictions/queues`.
*   **WebSocket Events:** `GateCongestion`, `SecurityAlert`, `MedicalEmergency`.

---

### 2. Live Map Console
*   **Purpose:** High-resolution spatial representation of the stadium.
*   **Widgets:** Layers Panel (Heatmaps, Medical Clinic overlays, GPS telemetry paths, Vendors, Transit Loops).
*   **Controls:** Zoom/Pan buttons, CCTV feed click triggers, Sector details drawer.
*   **AI Components:** Predicted Congestion Heatmaps overlaying ML density forecasts.
*   **APIs Used:** `GET /api/v1/stadium/graph`, `POST /api/v1/navigation/route`.
*   **WebSocket Events:** `CrowdDetected`, `GPS_Update`.

---

### 3. Copilot Chat Center
*   **Purpose:** Interface for querying SOP documents and database tables.
*   **Widgets:** Search box, Document Index viewer, Chat History list.
*   **AI Components:** Grounded conversational answers with highlighted citations and related action buttons.
*   **APIs Used:** `POST /api/v1/copilot/chat`, `GET /api/v1/rag/documents`.
*   **WebSocket Events:** `AnnouncementGenerated`.

---

## 5. Dashboard Visual Design

### 1. Operations Executive Dashboard
*   **Summary KPI Banner:** Active Fans (62,400), Active Staff (1,240), Active Incidents (2), Ingress Speed (94% optimal).
*   **ML Prediction Alert Panel:** High-priority predictions panel. (e.g., "Predicted bottleneck at Gate B in 15 mins. Confidence: 91%").
*   **RAG SOP Assistant Pane:** Contextual RAG search box embedded on the side panel.

### 2. Security Dashboard
*   **CV Alerts Stream:** Live feed of CV alerts (e.g., "Intrusion in Player Tunnel Section 1"). Click plays the 10-second GCS video clip.
*   **Active Patrol Tracker:** Displays guard locations, shift assignments, and route completion percentages.

### 3. Medical Dashboard
*   **Responder Map Overlay:** Displays live GPS coordinates of first responders. Colors indicate status (Red: busy, Green: available).
*   **Clinic Capacity Grid:** Lists available beds at clinics (e.g., Clinic West: 8/10 occupied).

---

## 6. Live Stadium Map

The Live Map is built using WebGL and Mapbox GL JS, overlaying real-time telemetry on a custom 3D stadium mesh.

```
+-----------------------------------------------------------+
|                    3D MAP LAYERS MENU                     |
|                                                           |
|   [x] Crowd Density Heatmap (Dynamic CSRNet gradients)     |
|   [ ] Staff GPS Tracker (Medical/Security positions)      |
|   [x] Gate wait times (Red/Amber/Green indicators)        |
|   [ ] Transit loops & Parking lot occupancy               |
+-----------------------------------------------------------+
```

### Map Layers & Interactions

1.  **Crowd Density Heatmap:**
    *   Renders crowd density using dynamic gradient shaders (low density is blue/green, moving to yellow, and turning deep red at $> 3.5\text{ people/m}^2$).
2.  **Interactive Camera Icons:**
    *   Clicking a camera icon opens a low-latency WebRTC CCTV stream in a picture-in-picture window.
3.  **Path Routing Overlay:**
    *   Displays routes for first responders, using red overlays to represent corridors with high crowd density.
4.  **Click-to-Assign:**
    *   Operators can click an incident location on the map and drag the cursor to the nearest volunteer to assign a dispatch task.

---

## 7. AI Assistant UI

The AI Assistant is designed as a collaborative decision-support interface, avoiding generic chatbot formats.

```
+-------------------------------------------------------------------------------------------------+
|                                 STADIUMOS COPILOT INSTRUCTIONS                                  |
|                                                                                                 |
|   Prompt: "Heavy rain expected in 30 mins."                                                     |
|                                                                                                 |
|   Recommendation: Close Stadium Roof & Deploy Wet-Weather Signage                               |
|   - Reasoning: Prevent pitch flooding and seating congestion.                                   |
|   - Evidence: Local radar precipitation index > 15mm/hr; Section 201 density predicted Amber.    |
|   - Citation: [Emergency SOPs, Section 8.4]                                                     |
|                                                                                                 |
|   [ ] Approve Roof Closure API Call      [ ] Deploy Vol. Poncho Runners     [ ] Dismiss Alert  |
+-------------------------------------------------------------------------------------------------+
```

### UI Features

*   **Evidence & Citations Pane:** Displays the exact numbers, CV headcounts, and RAG document pages that generated the response, with link targets.
*   **Confidence Slider:** Displays the model's confidence rating as a colored progress bar (Green: $> 85\%$, Amber: $70-85\%$, Red: $< 70\%$).
*   **Actionable Buttons:** Displays buttons next to AI recommendations to execute tool commands directly (e.g., `Approve Route Override`).

---

## 8. Real-Time Notifications

Notifications use a visual hierarchy to indicate severity and priority:

| Notification Type | Color Code (Hex) | Icon | Screen Priority | Action Required |
| :--- | :--- | :---: | :---: | :--- |
| **Critical Safety** | Red (`#D32F2F`) | `Emergency` | Direct Full Overlay | Requires manual confirmation or override within 10 seconds. |
| **Operational Warning**| Amber (`#F57C00`) | `Warning` | Floating Toast Alert | Displays for 15 seconds; can be dismissed or expanded. |
| **Information Update** | Blue (`#1976D2`) | `Info` | Notification Bell dot | Badge counter increment; silent update to log list. |
| **Success Alert** | Green (`#388E3C`) | `Check` | Toast Alert | Automatically fades after 3 seconds. |

---

## 9. Charts & Analytics

StadiumOS selects charts based on their capability to visualize real-time time-series parameters:

*   **Crowd Density Over Time:** Area Chart (visualizes cumulative gate check-ins and detects spikes).
*   **Predicted Wait Times:** Bar Chart comparing current vs. predicted wait times across gates.
*   **Concessions Demand Trends:** Grouped Line Chart plotting sales velocity versus time elapsed.
*   **Parking Occupancy:** Gauge Chart displaying percentage saturation.
*   **Medical Cases:** Stacked Bar Chart mapping triage levels (Red/Amber/Green) across active clinic locations.

---

## 10. Accessibility (A11y)

*   **Screen Reader Support:** UI elements are configured with semantic HTML tags and explicit `aria-label` labels. Active alerts use `aria-live="assertive"` to trigger immediate screen reader announcements.
*   **Keyboard Navigation:** Enforces a logical tab order across all interactive elements, with a distinct visual focus border around selected items.
*   **High-Contrast & Color Blind Support:** Interfaces can be toggled to high-contrast mode (contrast ratio $> 7:1$). Heatmaps use textured overlays in addition to colors to represent density levels.
*   **Multi-language Support:** The interface can be dynamically translated into 15+ languages using localization configurations.

---

## 11. Responsive Layout Strategy

The UI uses a CSS Grid layout system to adapt to different screen profiles:

*   **Desktop Console (OCC):** Multi-column dashboard layout displaying map coordinates, alert streams, and charts simultaneously.
*   **Tablet Console (Vendors / Clinics):** Focuses on single-column lists and tables with large tap targets ($> 48\text{px}$).
*   **Mobile App (Fans / Volunteers):** Single-page view optimized for one-handed use, featuring sticky navigation bars.
*   **Large Display Wall (Stadium Ops Room):** Simplified visual layout with large typography and maps, designed to be read from a distance.

---

## 12. Reusable Component Library

The frontend uses a custom library of Material Design 3 React components:

*   `OperationalCard`: Encapsulates metrics and charts, featuring border highlights that indicate active alert statuses.
*   `LiveCCTVFeedWindow`: Embeds WebRTC CCTV feeds with built-in controls to capture clips or dispatch security.
*   `StatusChip`: Renders triage levels using high-contrast borders and text tags.
*   `AICopilotProposalCard`: Renders AI recommendations, reasoning trails, confidence sliders, and action buttons.
*   `InteractiveMapLayer`: Encapsulates Mapbox layers, managing real-time coordinates rendering.

---

## 13. Frontend Folder Structure

The folder structure organizes components logically by feature domain:

```
stadiumos-frontend/
├── public/                     # Static assets & map blueprints
├── src/
│   ├── assets/                 # SVGs & theme configurations
│   ├── components/             # Reusable UI components
│   │   ├── ui/                 # Cards, Buttons, Chips
│   │   ├── map/                # Map layers & tooltips
│   │   └── ai/                 # Copilot components
│   ├── features/               # Domain-specific modules
│   │   ├── crowd/              # Ingress & density modules
│   │   ├── medical/            # Clinic & dispatch consoles
│   │   ├── concessions/        # Inventory & sales widgets
│   │   └── auth/               # Login & signup flows
│   ├── hooks/                  # Custom React hooks (WS connection, SSE)
│   ├── services/               # API clients (Axios instance, RAG client)
│   ├── store/                  # Global state management (Zustand)
│   ├── theme/                  # Color palettes & typography definitions
│   ├── utils/                  # Coordinate calculations & formatting helpers
│   ├── App.tsx
│   └── main.tsx
├── package.json
└── tsconfig.json
```

---

## 14. API & Integration Model

*   **REST Client Integration:** Uses an Axios instance configured with interception hooks to inject authorization headers and handle token refresh flows automatically.
*   **WebSocket Stream Manager:** Implements a custom React context (`WebSocketProvider`) to manage connection states, route incoming payloads to the correct feature stores, and execute automatic reconnection loops during network drops.
*   **Map Rendering Pipeline:** Uses Mapbox GL JS to load stadium vector maps, updating telemetry overlays in response to WebSocket events.

---

## 15. User Flows

### Scenario 1: Fan Navigation Request
1.  The fan opens the navigation drawer in the mobile app and selects a destination (e.g., Section 102).
2.  The app queries `POST /api/v1/navigation/route` with accessibility constraints.
3.  The Navigation Service calculates a step-free path that avoids active congestion zones.
4.  The path is rendered as a blue overlay on the fan's mobile map interface.

---

### Scenario 2: Medical Dispatch Task
1.  An edge camera detects a fall in Section 104, triggering a `FallDetected` alert.
2.  The Medical Dashboard flashes a red card and sounds an alarm.
3.  The supervisor reviews the dispatch recommendation (Team 3, ETA 1m 45s).
4.  The supervisor clicks "Approve Dispatch," routing coordinates and triage details to Team 3's mobile device.

---

## 16. Design System Details

*   **Typography:** Google Font **Outfit** (modern geometric sans-serif for headings, providing high legibility) and **Inter** (for body text and tabular data values).
*   **Spacing Scale:** Standard 8px spatial grid to maintain layout consistency.
*   **Border Radius:** Card overlays use a $16\text{px}$ corner radius; buttons use a $24\text{px}$ radius.
*   **Color Palette (Dark Theme Defaults):**
    *   *Background:* `#0C0E12` (deep dark grey, reducing glare during night matches).
    *   *Surface Card:* `#161920` (slate grey).
    *   *Primary Brand:* `#00E676` (vibrant neon green).
    *   *Secondary Accents:* `#2979FF` (bright blue).

---

## 17. Dashboard Wireframes

### 1. Operations Command Center (OCC) Dashboard Wireframe

```
+-------------------------------------------------------------------------------------------------+
|  StadiumOS [FWC 2026]                                                   [Active Fans: 62,400]   |
+-------------------------------------------------------------------------------------------------+
|  [Ingress Speed: 94%]  [Staff Online: 1,240]  [Weather: Clear]          [Match Min: 72] [2-1]   |
+-------------------------------------------------------------------------------------------------+
|  STADIUM 3D GRAPH MAP LAYERS OVERLAY              |  ACTIVE ALERTS PANEL                        |
|                                                   |  [CRITICAL] Fight in Concourse 12 (01:14s)  |
|  +---------------------------------------------+  |  [AMBER] Gate B wait time forecast: 25m     |
|  | [Gate A] Wait: 2 mins                       |  |                                             |
|  |                                             |  +---------------------------------------------+
|  |         [ bowl ]                            |  |  LANGGRAPH AGENT COGNITIVE RECOMMENDATION   |
|  |                                             |  |  "Gate B bottleneck predicted in 15 mins.   |
|  |     [Gate B] Wait: 12 mins (AMBER)          |  |   Redirect flow to Gate C?"                 |
|  |                                             |  |   Evidence: Ingress 120/min; density 3.1.   |
|  |                                             |  |   [APPROVE OVERRIDE]    [DISMISS]           |
|  +---------------------------------------------+  +---------------------------------------------+
|  QUEUE TIME HISTOGRAM CHART                       |  CONCESSIONS DEMAND TIME CHART              |
|  [ | | | | | | | | | | | | | | | | ]              |  [ -------------------------------------- ] |
+-------------------------------------------------------------------------------------------------+
```

---

### 2. Fan Mobile App Wireframe

```
+---------------------------------------+
|  StadiumOS                           |
+---------------------------------------+
|  [ MATCH TICKETS: ARG vs DEU ]        |
|  Sec 102 | Row 12 | Seat 4            |
|  +---------------------------------+  |
|  | [SCAN CODE FOR ENTRY]           |  |
|  +---------------------------------+  |
+---------------------------------------+
|  STADIUM NAVIGATION                   |
|  [ Search concessions, ramps, exits ] |
|  Map Overlay:                         |
|  +---------------------------------+  |
|  |  [Seat Route: Proceed to Gate A]|  |
|  |  Gate A Wait Time: 2 mins       |  |
|  +---------------------------------+  |
+---------------------------------------+
|  COPILOT ASSISTANT                    |
|  "Where is the nearest food kiosk?"   |
|  [ Ask a question...            ] [v] |
+---------------------------------------+
```

---

### 3. Volunteer Mobile App Wireframe

```
+---------------------------------------+
|  StadiumOS - Volunteer Console        |
+---------------------------------------+
|  Volunteer: Mateo  |  Status: ACTIVE  |
+---------------------------------------+
|  ACTIVE SHIFT ASSIGNMENT              |
|  Zone: Concourse Gate B               |
|  Task: Directional Flow Management    |
+---------------------------------------+
|  LANGGRAPH TASK ALERTS                |
|  [!] REDIRECT REQUESTED               |
|  "Congestion forming near turnstile B.|
|   Please route fans to Gate C."       |
|  [ ACCEPT ASSIGNMENT ]   [ DECLINE ]  |
+---------------------------------------+
|  STADIUM SOP SEARCH RAG               |
|  [ Query safety handbooks...      ]   |
+---------------------------------------+
```

---

## 18. Technology Choices Matrix

| Component | Technology | Reason for Selection | Possible Alternative |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | React.js (TypeScript) | Type-safe development, state rendering speed, and a large ecosystem of visual libraries. | Vue.js / Svelte |
| **Styling Engine** | Tailwind CSS | Utility-first compilation, minimal bundle sizes, and simple responsive configuration. | Styled Components |
| **Component System** | Material UI (MUI) / Radix | Standard accessibility compliance (ARIA labels) and flexible component structure. | Ant Design |
| **Real-time Map Rendering**| Mapbox GL JS | Hardware-accelerated canvas map rendering, support for 3D meshes, and custom layers. | OpenLayers |
| **Interactive Charts** | Recharts / Chart.js | Built-in responsive containers, clean SVGs, and transition animations. | D3.js |
| **State Management** | Zustand | Lightweight global state store, fast hooks, and simple configuration. | Redux Toolkit |
| **WebSocket Connection** | Socket.io-client | Automated reconnection logic, packet buffer queues, and fallback support. | Native WebSocket API |
| **Date Utilities** | date-fns | Tree-shakable date formatting tools that minimize bundle footprint sizes. | Moment.js |
| **Interactive Testing** | Cypress / Playwright | End-to-end browser integration testing, headless validations, and visual regressions checks. | Selenium |
| **Build System** | Vite | Faster module loading speeds, hot module reloading (HMR), and simple build pipelines. | Webpack |
| **Internationalization** | i18next | Multi-language translation support with fallback fallbacks. | react-intl |
| **Icon Library** | Lucide React | Clean, scalable SVG icons that load dynamically. | Material Icons |
