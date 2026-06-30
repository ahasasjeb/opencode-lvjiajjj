const endpoints = [
  ["POST", "/api/share", "创建公开分享"],
  ["POST", "/api/share/:id/sync", "增量同步数据"],
  ["GET", "/api/share/:id/data", "读取原始快照"],
  ["DELETE", "/api/share/:id", "撤销分享"],
]

export default function Home() {
  return (
    <main className="landing">
      <nav className="nav">
        <a className="brand" href="/">
          <span className="brandMark">R</span>
          Relay
        </a>
        <a className="statusPill" href="/api/health">
          <span />
          API status
        </a>
      </nav>

      <section className="hero">
        <p className="eyebrow">OPEN SHARE INFRASTRUCTURE</p>
        <h1>
          会话抵达这里，
          <br />
          然后变得<span>可分享。</span>
        </h1>
        <p className="lede">
          一个独立、轻量的 opencode 分享服务。兼容持续同步协议，
          <br className="wideOnly" />
          数据留在你自己的 Postgres 中。
        </p>
        <div className="heroActions">
          <a className="primaryButton" href="#protocol">
            查看接口 <span>↘</span>
          </a>
          <code>bun run dev</code>
        </div>
      </section>

      <section className="featureStrip">
        <article>
          <span>01</span>
          <h2>协议兼容</h2>
          <p>同时支持 legacy 与 org 路由，CLI 导入无需适配。</p>
        </article>
        <article>
          <span>02</span>
          <h2>增量持久化</h2>
          <p>消息和 part 按稳定键合并，重复同步保持幂等。</p>
        </article>
        <article>
          <span>03</span>
          <h2>边界清晰</h2>
          <p>不依赖 opencode 包；唯一的连接面是 HTTP 协议。</p>
        </article>
      </section>

      <section className="protocol" id="protocol">
        <div className="sectionIntro">
          <p className="eyebrow">THE CONTRACT</p>
          <h2>四个接口，完整闭环。</h2>
          <p>创建返回写入密钥；同步和删除必须出示密钥。读取保持公开，适配分享页与 CLI import。</p>
        </div>
        <div className="endpointList">
          {endpoints.map((endpoint) => (
            <div className="endpoint" key={endpoint[1]}>
              <span className={`method ${endpoint[0].toLowerCase()}`}>{endpoint[0]}</span>
              <code>{endpoint[1]}</code>
              <p>{endpoint[2]}</p>
              <span className="arrow">→</span>
            </div>
          ))}
        </div>
      </section>

      <footer>
        <div className="brand">
          <span className="brandMark">R</span>
          Relay
        </div>
        <p>Standalone by design · Bun + Next.js + Postgres</p>
      </footer>
    </main>
  )
}
