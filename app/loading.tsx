export default function Loading() {
  return (
    <main className="shell">
      <header className="topBar">
        <div className="brandMark" aria-hidden="true">G</div>
        <div>
          <strong>GooseGame Lab</strong>
          <span>正在同步数据</span>
        </div>
      </header>
      <section className="hero skeletonHero" aria-busy="true" aria-live="polite">
        <div>
          <p className="eyebrow">GooseGame</p>
          <h1>鹅鸭杀发车助手</h1>
          <p className="heroCopy">正在加载对局与玩家数据...</p>
        </div>
        <div className="heroStats">
          <div className="metric skeletonBlock" />
          <div className="metric skeletonBlock" />
          <div className="metric skeletonBlock" />
        </div>
      </section>
    </main>
  );
}
