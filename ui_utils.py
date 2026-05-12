import streamlit as st

# ============================================================
# Color System
# ============================================================

FACTION_COLORS = {
    "鹅": {"hex": "#059669", "bg": "rgba(5, 150, 105, 0.10)", "border": "rgba(5, 150, 105, 0.24)", "emoji": "🪿"},
    "鸭": {"hex": "#E11D48", "bg": "rgba(225, 29, 72, 0.09)", "border": "rgba(225, 29, 72, 0.22)", "emoji": "🦆"},
    "中立": {"hex": "#7C3AED", "bg": "rgba(124, 58, 237, 0.09)", "border": "rgba(124, 58, 237, 0.22)", "emoji": "⚪"},
}

BRAND_COLORS = {
    "primary": "#047857",
    "primary_light": "#10B981",
    "accent": "#0284C7",
    "warning": "#D97706",
    "danger": "#DC2626",
    "success": "#059669",
}


# ============================================================
# Base Styles
# ============================================================

def apply_base_styles():
    st.markdown(
        """
<style>
/* --- Base tokens --- */
:root {
  --gg-bg: #F6F8FB;
  --gg-surface: rgba(255, 255, 255, 0.96);
  --gg-surface-soft: #F9FAFB;
  --gg-ink: #111827;
  --gg-muted: #64748B;
  --gg-subtle: #94A3B8;
  --gg-line: rgba(15, 23, 42, 0.10);
  --gg-line-strong: rgba(15, 23, 42, 0.16);
  --gg-primary: #047857;
  --gg-primary-soft: rgba(4, 120, 87, 0.10);
  --gg-accent: #0284C7;
  --gg-radius: 8px;
  --gg-shadow: 0 14px 42px rgba(15, 23, 42, 0.08);
}

html, body, [class*="css"] {
  font-family: -apple-system, BlinkMacSystemFont, "Inter", "SF Pro Text", "PingFang SC",
    "Microsoft YaHei", "Noto Sans SC", system-ui, sans-serif;
  font-size: 16px;
  color: var(--gg-ink);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

html { background: var(--gg-bg); }

body,
[data-testid="stAppViewContainer"] {
  background:
    radial-gradient(circle at 12% -10%, rgba(4, 120, 87, 0.10), transparent 30%),
    radial-gradient(circle at 90% 0%, rgba(2, 132, 199, 0.09), transparent 28%),
    linear-gradient(180deg, #FBFCFE 0%, #F6F8FB 42%, #F4F7FA 100%);
}

#MainMenu { visibility: hidden; }
footer { visibility: hidden; }
header { visibility: hidden; }

.block-container {
  padding-top: 1.25rem;
  padding-bottom: 2.25rem;
  max-width: 1100px;
}

section[data-testid="stSidebar"] {
  background: rgba(255, 255, 255, 0.94);
  border-right: 1px solid var(--gg-line);
}

::selection { background: rgba(4, 120, 87, 0.16); color: var(--gg-ink); }
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(100, 116, 139, 0.24); border-radius: 8px; }

/* --- Hero and cards --- */
.gg-card {
  border: 1px solid var(--gg-line);
  border-radius: var(--gg-radius);
  padding: 22px 24px;
  background: var(--gg-surface);
  box-shadow: var(--gg-shadow);
  transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
}

.gg-card:hover {
  border-color: rgba(4, 120, 87, 0.22);
  box-shadow: 0 18px 50px rgba(15, 23, 42, 0.10);
  transform: translateY(-1px);
}

.gg-card-goose  { border-left: 3px solid #059669; }
.gg-card-duck   { border-left: 3px solid #E11D48; }
.gg-card-neutral { border-left: 3px solid #7C3AED; }

.gg-pill,
.gg-pill-goose,
.gg-pill-duck,
.gg-pill-neutral,
.gg-pill-win,
.gg-pill-lose {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0;
  white-space: nowrap;
}

.gg-pill {
  background: var(--gg-primary-soft);
  border: 1px solid rgba(4, 120, 87, 0.18);
  color: #047857;
}

.gg-pill-goose   { background: rgba(5, 150, 105, 0.10); border: 1px solid rgba(5, 150, 105, 0.22); color: #047857; }
.gg-pill-duck    { background: rgba(225, 29, 72, 0.09); border: 1px solid rgba(225, 29, 72, 0.20); color: #BE123C; }
.gg-pill-neutral { background: rgba(124, 58, 237, 0.09); border: 1px solid rgba(124, 58, 237, 0.20); color: #6D28D9; }
.gg-pill-win     { background: rgba(5, 150, 105, 0.10); border: 1px solid rgba(5, 150, 105, 0.22); color: #047857; }
.gg-pill-lose    { background: rgba(220, 38, 38, 0.08); border: 1px solid rgba(220, 38, 38, 0.18); color: #B91C1C; }

.gg-title {
  font-size: clamp(1.65rem, 5vw, 2.45rem);
  font-weight: 850;
  line-height: 1.14;
  margin: 0.6rem 0 0 0;
  color: var(--gg-ink);
  letter-spacing: 0;
}

.gg-sub {
  margin: 0.55rem 0 0 0;
  color: var(--gg-muted);
  font-size: 0.98rem;
  line-height: 1.65;
  max-width: 760px;
}

.gg-section-title {
  font-size: 1.05rem;
  font-weight: 800;
  margin: 1.4rem 0 0.7rem 0;
  color: var(--gg-ink);
}

.gg-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--gg-line), transparent);
  margin: 1.3rem 0;
  border: none;
}

/* --- Metrics and rows --- */
.gg-metric-card {
  min-height: 108px;
  background: linear-gradient(180deg, #FFFFFF 0%, #F9FAFB 100%);
  border: 1px solid var(--gg-line);
  border-radius: var(--gg-radius);
  padding: 17px 16px;
  text-align: left;
  box-shadow: 0 8px 28px rgba(15, 23, 42, 0.05);
  transition: border-color 160ms ease, transform 160ms ease;
}
.gg-metric-card:hover {
  transform: translateY(-1px);
  border-color: var(--gg-line-strong);
}
.gg-metric-value {
  font-size: clamp(1.45rem, 4.5vw, 2rem);
  font-weight: 850;
  line-height: 1.12;
  word-break: break-word;
}
.gg-metric-label {
  font-size: 0.82rem;
  color: var(--gg-muted);
  margin-top: 0.35rem;
  line-height: 1.35;
}

.gg-empty {
  border: 1px dashed rgba(100, 116, 139, 0.28);
  border-radius: var(--gg-radius);
  padding: 32px 18px;
  background: rgba(255, 255, 255, 0.72);
  text-align: center;
  color: var(--gg-muted);
}
.gg-empty-icon { font-size: 2.3rem; line-height: 1; margin-bottom: 0.65rem; }
.gg-empty-title { font-weight: 800; color: var(--gg-ink); margin-bottom: 0.25rem; }
.gg-empty-sub { font-size: 0.9rem; line-height: 1.55; }

.gg-list-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 52px;
  padding: 11px 14px;
  margin: 0.35rem 0;
  border: 1px solid var(--gg-line);
  border-radius: var(--gg-radius);
  background: rgba(255, 255, 255, 0.88);
  transition: border-color 160ms ease, background 160ms ease, transform 160ms ease;
}
.gg-list-card:hover {
  border-color: rgba(4, 120, 87, 0.22);
  background: #FFFFFF;
  transform: translateY(-1px);
}
.gg-list-main {
  font-weight: 800;
  color: var(--gg-ink);
  min-width: 0;
  overflow-wrap: anywhere;
}
.gg-list-meta {
  margin-left: auto;
  color: var(--gg-muted);
  font-size: 0.84rem;
  text-align: right;
}
.gg-row-muted { color: var(--gg-muted); font-size: 0.86rem; }

/* --- Streamlit controls --- */
.stTabs [data-baseweb="tab-list"] {
  gap: 0.35rem;
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid var(--gg-line);
  border-radius: var(--gg-radius);
  padding: 4px;
  overflow-x: auto;
}
.stTabs [data-baseweb="tab"] {
  border-radius: 6px;
  padding: 0.55rem 1rem;
  color: var(--gg-muted);
  font-weight: 750;
  transition: background 140ms ease, color 140ms ease;
}
.stTabs [data-baseweb="tab"][aria-selected="true"] {
  background: #111827;
  color: #FFFFFF;
}
.stTabs [data-baseweb="tab"]:hover {
  background: rgba(4, 120, 87, 0.08);
  color: var(--gg-ink);
}

.stButton > button {
  border-radius: var(--gg-radius) !important;
  min-height: 42px !important;
  padding: 0.58rem 1rem !important;
  font-weight: 800 !important;
  transition: background 150ms ease, border-color 150ms ease, transform 150ms ease, box-shadow 150ms ease !important;
  border: 1px solid var(--gg-line-strong) !important;
  box-shadow: none !important;
}
.stButton > button:hover {
  transform: translateY(-1px);
  border-color: rgba(4, 120, 87, 0.28) !important;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08) !important;
}
.stButton > button[kind="primary"] {
  background: #111827 !important;
  border-color: #111827 !important;
  color: #FFFFFF !important;
}
.stButton > button[kind="primary"]:hover {
  background: #047857 !important;
  border-color: #047857 !important;
}

[data-testid="stForm"],
[data-testid="stVerticalBlockBorderWrapper"] {
  border-radius: var(--gg-radius) !important;
  border-color: var(--gg-line) !important;
  background: rgba(255, 255, 255, 0.78) !important;
}

[data-baseweb="select"] > div,
[data-baseweb="input"] > div,
.stTextInput input,
.stDateInput input,
textarea {
  border-radius: var(--gg-radius) !important;
  border-color: var(--gg-line-strong) !important;
  background: #FFFFFF !important;
}

[data-baseweb="select"] > div:hover,
[data-baseweb="input"] > div:hover,
.stTextInput input:hover,
.stDateInput input:hover,
textarea:hover {
  border-color: rgba(4, 120, 87, 0.32) !important;
}

[data-testid="stFileUploaderDropzone"] {
  border-radius: var(--gg-radius) !important;
  border: 1px dashed rgba(4, 120, 87, 0.32) !important;
  background: rgba(4, 120, 87, 0.04) !important;
}

[data-testid="stDataFrame"] {
  border-radius: var(--gg-radius);
  overflow: hidden;
  border: 1px solid var(--gg-line);
  box-shadow: 0 8px 28px rgba(15, 23, 42, 0.05);
}
[data-testid="stDataFrame"] thead th {
  background: #F8FAFC !important;
  color: var(--gg-muted) !important;
  font-weight: 800;
  font-size: 0.8rem;
  text-transform: none;
  letter-spacing: 0;
}
[data-testid="stDataFrame"] tbody tr:hover {
  background: rgba(4, 120, 87, 0.04) !important;
}

[data-testid="stMetricValue"] { font-size: 1.75rem !important; font-weight: 850 !important; }
[data-testid="stMetricLabel"] { font-size: 0.82rem !important; color: var(--gg-muted) !important; }

[data-testid="stExpander"] {
  border-radius: var(--gg-radius);
  border: 1px solid var(--gg-line);
  background: rgba(255, 255, 255, 0.84);
}

[data-testid="stAlert"] {
  border-radius: var(--gg-radius);
  border: 1px solid var(--gg-line);
}

/* --- Light interaction details --- */
@keyframes ggPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.45; }
}
.gg-live-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #059669;
  animation: ggPulse 1.6s ease-in-out infinite;
  margin-right: 6px;
}
.gg-shimmer {
  position: relative;
  overflow: hidden;
}
.gg-shimmer::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent);
  transform: translateX(-100%);
  animation: ggShimmer 1.8s ease-in-out infinite;
}
@keyframes ggShimmer {
  100% { transform: translateX(100%); }
}

/* --- Mobile and WeChat-friendly layout --- */
@media (max-width: 700px) {
  html, body, [class*="css"] { font-size: 15px; }
  .block-container {
    padding: 0.75rem 0.75rem 1.4rem 0.75rem;
    max-width: 100%;
  }
  .gg-card {
    padding: 16px;
    box-shadow: 0 8px 26px rgba(15, 23, 42, 0.07);
  }
  .gg-title { font-size: 1.7rem; }
  .gg-sub { font-size: 0.92rem; }
  .gg-section-title { margin-top: 1.05rem; }
  .gg-metric-card { min-height: 92px; padding: 14px; }
  .gg-metric-value { font-size: 1.35rem; }
  .stTabs [data-baseweb="tab-list"] { gap: 0.25rem; }
  .stTabs [data-baseweb="tab"] {
    padding: 0.46rem 0.72rem;
    font-size: 0.86rem;
    white-space: nowrap;
  }
  .gg-list-card {
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 0.45rem 0.65rem;
  }
  .gg-list-meta {
    width: 100%;
    margin-left: 0;
    text-align: left;
  }
  [data-testid="column"] {
    min-width: 0 !important;
  }
}
</style>
""",
        unsafe_allow_html=True,
    )


# ============================================================
# Shared Components
# ============================================================

def render_page_card(pill_text: str, title_text: str, subtitle_text: str, faction: str | None = None):
    accent_class = ""
    if faction == "鹅":
        accent_class = "gg-card-goose"
    elif faction == "鸭":
        accent_class = "gg-card-duck"
    elif faction == "中立":
        accent_class = "gg-card-neutral"

    st.markdown(
        f'<div class="gg-card {accent_class}">'
        f'  <div class="gg-pill">{pill_text}</div>'
        f'  <p class="gg-title">{title_text}</p>'
        f'  <p class="gg-sub">{subtitle_text}</p>'
        f'</div>',
        unsafe_allow_html=True,
    )


def render_section_title(text: str):
    st.markdown(f'<p class="gg-section-title">{text}</p>', unsafe_allow_html=True)


def render_section_divider():
    st.markdown('<div class="gg-divider"></div>', unsafe_allow_html=True)


def render_empty_state(title: str, subtitle: str = "", icon: str = "·"):
    subtitle_html = f'<div class="gg-empty-sub">{subtitle}</div>' if subtitle else ""
    st.markdown(
        f'<div class="gg-empty">'
        f'<div class="gg-empty-icon">{icon}</div>'
        f'<div class="gg-empty-title">{title}</div>'
        f'{subtitle_html}'
        f'</div>',
        unsafe_allow_html=True,
    )


def render_stat_card(label: str, value, color: str = "#059669", icon: str = ""):
    icon_html = f'<div style="font-size:1.6rem;margin-bottom:0.25rem;">{icon}</div>' if icon else ""
    st.markdown(
        f'<div class="gg-metric-card" style="border-top:3px solid {color};">'
        f'{icon_html}'
        f'<div class="gg-metric-value" style="color:{color};">{value}</div>'
        f'<div class="gg-metric-label">{label}</div>'
        f'</div>',
        unsafe_allow_html=True,
    )


def render_faction_badge(faction: str):
    emoji_map = {"鹅": "🪿", "鸭": "🦆", "中立": "⚪"}
    emoji = emoji_map.get(faction, "⚪")
    class_map = {"鹅": "gg-pill-goose", "鸭": "gg-pill-duck", "中立": "gg-pill-neutral"}
    cls = class_map.get(faction, "gg-pill-neutral")
    st.markdown(
        f'<span class="{cls}" style="margin-right:6px;">{emoji} {faction}</span>',
        unsafe_allow_html=True,
    )


def render_live_indicator(text: str = "实时"):
    st.markdown(
        f'<span class="gg-live-dot"></span>'
        f'<span style="color:#86EFAC;font-size:0.8rem;font-weight:600;">{text}</span>',
        unsafe_allow_html=True,
    )


def render_player_tag(name: str, faction: str | None = None):
    fc = FACTION_COLORS.get(faction, None) if faction else None
    bg = fc["bg"] if fc else "rgba(16,185,129,0.12)"
    color = fc["hex"] if fc else "#6EE7B7"
    st.markdown(
        f'<span style="display:inline-block;margin:4px 6px;padding:5px 12px;'
        f'background:{bg};color:{color};border-radius:8px;font-weight:600;'
        f'font-size:0.9rem;">{name}</span>',
        unsafe_allow_html=True,
    )


def render_record_row(
    main: str,
    meta: str,
    badge: str = "",
    color: str = "#047857",
    icon: str = "",
    muted: str = "",
):
    icon_html = f'<span style="font-size:1.25rem;line-height:1;">{icon}</span>' if icon else ""
    badge_html = f'<span class="gg-pill" style="color:{color};border-color:{color}33;background:{color}14;">{badge}</span>' if badge else ""
    muted_html = f'<span class="gg-list-meta">{muted}</span>' if muted else ""
    st.markdown(
        f'<div class="gg-list-card">'
        f'{icon_html}'
        f'<span class="gg-list-main" style="color:{color};">{main}</span>'
        f'<span class="gg-row-muted">{meta}</span>'
        f'{badge_html}'
        f'{muted_html}'
        f'</div>',
        unsafe_allow_html=True,
    )
