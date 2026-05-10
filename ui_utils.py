import streamlit as st

# ============================================================
# Color System
# ============================================================

FACTION_COLORS = {
    "鹅": {"hex": "#10B981", "bg": "rgba(16, 185, 129, 0.15)", "border": "rgba(16, 185, 129, 0.40)", "emoji": "🪿"},
    "鸭": {"hex": "#F43F5E", "bg": "rgba(244, 63, 94, 0.15)", "border": "rgba(244, 63, 94, 0.40)", "emoji": "🦆"},
    "中立": {"hex": "#A78BFA", "bg": "rgba(167, 139, 250, 0.15)", "border": "rgba(167, 139, 250, 0.40)", "emoji": "⚪"},
}

BRAND_COLORS = {
    "primary": "#059669",
    "primary_light": "#10B981",
    "accent": "#06B6D4",
    "warning": "#F59E0B",
    "danger": "#EF4444",
    "success": "#22C55E",
}


# ============================================================
# Base Styles
# ============================================================

def apply_base_styles():
    st.markdown(
        """
<style>
/* --- Typography --- */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

html, body, [class*="css"] {
  font-family: 'Inter', 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', system-ui, -apple-system, sans-serif;
  font-size: 16px;
  -webkit-font-smoothing: antialiased;
}

/* --- Chrome --- */
#MainMenu {visibility: hidden;}
footer {visibility: hidden;}
header {visibility: hidden;}

.block-container {
  padding-top: 1.5rem;
  padding-bottom: 2rem;
  max-width: 1024px;
}

::-webkit-scrollbar {width:6px;height:6px;}
::-webkit-scrollbar-track {background:transparent;}
::-webkit-scrollbar-thumb {background:rgba(255,255,255,0.12);border-radius:3px;}
::-webkit-scrollbar-thumb:hover {background:rgba(255,255,255,0.22);}
::selection {background:rgba(5,150,105,0.3);color:#F1F5F9;}

/* --- Cards --- */
.gg-card {
  border: 1px solid rgba(255, 255, 255, 0.10);
  border-radius: 16px;
  padding: 20px 24px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.02) 100%);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.25), 0 1px 3px rgba(0, 0, 0, 0.15);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  animation: ggFadeIn 0.4s ease-out both;
}

.gg-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35), 0 2px 6px rgba(0, 0, 0, 0.2);
}

.gg-card-goose  { border-left: 3px solid #10B981; }
.gg-card-duck   { border-left: 3px solid #F43F5E; }
.gg-card-neutral { border-left: 3px solid #A78BFA; }

/* --- Pills --- */
.gg-pill {
  display: inline-block;
  padding: 3px 12px;
  border-radius: 999px;
  font-size: 0.82rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  background: rgba(5, 150, 105, 0.15);
  border: 1px solid rgba(5, 150, 105, 0.35);
  color: #6EE7B7;
}

.gg-pill-goose   { background: rgba(16, 185, 129, 0.15); border-color: rgba(16, 185, 129, 0.35); color: #6EE7B7; }
.gg-pill-duck    { background: rgba(244, 63, 94, 0.15);  border-color: rgba(244, 63, 94, 0.35);  color: #FDA4AF; }
.gg-pill-neutral { background: rgba(167, 139, 250, 0.15); border-color: rgba(167, 139, 250, 0.35); color: #C4B5FD; }
.gg-pill-win     { background: rgba(34, 197, 94, 0.18);  border-color: rgba(34, 197, 94, 0.40);  color: #86EFAC; }
.gg-pill-lose    { background: rgba(239, 68, 68, 0.15);  border-color: rgba(239, 68, 68, 0.35);  color: #FCA5A5; }

/* --- Typography --- */
.gg-title {
  font-size: 1.5rem;
  font-weight: 800;
  line-height: 1.3;
  margin: 0;
  background: linear-gradient(135deg, #F1F5F9 0%, #A7F3D0 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.gg-sub {
  margin: 0.4rem 0 0 0;
  opacity: 0.78;
  font-size: 0.95rem;
  line-height: 1.5;
  color: #CBD5E1;
}

.gg-section-title {
  font-size: 1.15rem;
  font-weight: 700;
  margin: 1.2rem 0 0.6rem 0;
  color: #E2E8F0;
}

/* --- Dividers --- */
.gg-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent);
  margin: 1.2rem 0;
  border: none;
}

/* --- Stat cards --- */
.gg-metric-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.01));
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 18px 16px;
  text-align: center;
}
.gg-metric-value {
  font-size: 2rem;
  font-weight: 800;
  line-height: 1.1;
  animation: ggCountUp 0.5s ease-out;
}
.gg-metric-label {
  font-size: 0.82rem;
  opacity: 0.65;
  margin-top: 0.2rem;
}

/* --- Tabs --- */
.stTabs [data-baseweb="tab-list"] {
  gap: 0.25rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  padding: 4px;
}
.stTabs [data-baseweb="tab"] {
  border-radius: 10px;
  padding: 0.5rem 1.25rem;
  font-weight: 500;
  transition: all 0.15s ease;
}
.stTabs [data-baseweb="tab"][aria-selected="true"] {
  background: rgba(5, 150, 105, 0.20);
  color: #6EE7B7;
}
.stTabs [data-baseweb="tab"]:hover {
  background: rgba(255, 255, 255, 0.06);
}

/* --- Buttons --- */
.stButton > button {
  border-radius: 12px !important;
  padding: 0.6rem 1.2rem !important;
  font-weight: 600 !important;
  transition: all 0.2s ease !important;
  border: none !important;
}
.stButton > button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);
}
.stButton > button[kind="primary"] {
  background: linear-gradient(135deg, #059669, #10B981) !important;
  color: #fff !important;
}

/* --- DataFrames --- */
[data-testid="stDataFrame"] {
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.10);
}
[data-testid="stDataFrame"] thead th {
  background: rgba(5, 150, 105, 0.12) !important;
  color: #6EE7B7 !important;
  font-weight: 600;
  font-size: 0.83rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
[data-testid="stDataFrame"] tbody tr:hover {
  background: rgba(255, 255, 255, 0.04) !important;
}

/* --- Metrics --- */
[data-testid="stMetricValue"] { font-size: 2rem !important; font-weight: 800 !important; }
[data-testid="stMetricLabel"] { font-size: 0.82rem !important; opacity: 0.7; }

/* --- Expanders --- */
[data-testid="stExpander"] {
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.02);
}

/* --- Inputs --- */
[data-baseweb="select"], [data-baseweb="input"], .stTextInput input {
  border-radius: 10px;
}

/* --- Animations --- */
@keyframes ggFadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes ggCountUp {
  from { opacity: 0; transform: scale(0.9); }
  to   { opacity: 1; transform: scale(1); }
}
@keyframes ggPulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.4; }
}
.gg-live-dot {
  display: inline-block;
  width: 8px; height: 8px;
  border-radius: 50%;
  background: #22C55E;
  animation: ggPulse 1.5s ease-in-out infinite;
  margin-right: 6px;
}
.gg-shimmer {
  background: linear-gradient(90deg, transparent 25%, rgba(255,255,255,0.05) 50%, transparent 75%);
  background-size: 200% 100%;
  animation: ggShimmer 1.5s ease-in-out infinite;
}
@keyframes ggShimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

/* --- Mobile --- */
@media (max-width: 700px) {
  .block-container { padding-left: 1rem; padding-right: 1rem; max-width: 100%; }
  .gg-card { padding: 14px 16px; border-radius: 12px; }
  .gg-title { font-size: 1.3rem; }
  .gg-metric-value { font-size: 1.5rem; }
  .stTabs [data-baseweb="tab"] { padding: 0.4rem 0.8rem; font-size: 0.85rem; }
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
