"use client"

import { useEffect, useState } from "react"
import { isObject, JsonValue, ShareView } from "../../../lib/types"

function string(value: JsonValue | undefined) {
  return typeof value === "string" ? value : undefined
}

function number(value: JsonValue | undefined) {
  return typeof value === "number" ? value : undefined
}

function displayTime(value: JsonValue | undefined) {
  if (typeof value !== "number" && typeof value !== "string") return "刚刚"
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
}

function Part({ part }: { part: Record<string, JsonValue> }) {
  if (part.type === "text" && typeof part.text === "string") return <div className="partText">{part.text}</div>
  if (part.type === "reasoning" && typeof part.text === "string")
    return (
      <details className="reasoning">
        <summary>思考过程</summary>
        <p>{part.text}</p>
      </details>
    )
  if (part.type === "tool") {
    const state = isObject(part.state) ? part.state : {}
    return (
      <details className="toolCall">
        <summary>
          <span>⌁</span>
          {string(part.tool) ?? "tool"}
          <small>{string(state.status) ?? "completed"}</small>
        </summary>
        <pre>{JSON.stringify(state, null, 2)}</pre>
      </details>
    )
  }
  if (part.type === "file")
    return (
      <div className="filePart">
        <span>↳</span>
        {string(part.filename) ?? string(part.url) ?? "file"}
      </div>
    )
  return null
}

export function SessionView({ id, initial }: { id: string; initial: ShareView }) {
  const [view, setView] = useState(initial)

  useEffect(() => {
    const timer = setInterval(() => {
      fetch(`/share_data?id=${encodeURIComponent(id)}`, { cache: "no-store" })
        .then((response) => (response.ok ? response.json() : undefined))
        .then((next) => next && setView(next))
    }, 3000)
    return () => clearInterval(timer)
  }, [id])

  const messages = Object.values(view.messages).sort((a, b) => {
    const aTime = isObject(a.time) ? number(a.time.created) ?? 0 : 0
    const bTime = isObject(b.time) ? number(b.time.created) ?? 0 : 0
    return aTime - bTime
  })
  const time = isObject(view.info.time) ? view.info.time : {}
  const summary = isObject(view.info.summary) ? view.info.summary : {}

  return (
    <main className="sharePage">
      <header className="shareHeader">
        <a className="brand" href="/">
          <span className="brandMark">R</span>
          Relay
        </a>
        <div className="live">
          <span />
          Live snapshot
        </div>
      </header>

      <section className="sessionHero">
        <div>
          <p className="sessionLabel">SHARED SESSION · {id.slice(-8).toUpperCase()}</p>
          <h1>{string(view.info.title) ?? "Untitled session"}</h1>
          <p className="sessionPath">{string(view.info.directory) ?? "opencode session"}</p>
        </div>
        <dl className="sessionStats">
          <div>
            <dt>MESSAGES</dt>
            <dd>{messages.length}</dd>
          </div>
          <div>
            <dt>CHANGES</dt>
            <dd>
              <span className="added">+{number(summary.additions) ?? 0}</span>{" "}
              <span className="removed">−{number(summary.deletions) ?? 0}</span>
            </dd>
          </div>
          <div>
            <dt>UPDATED</dt>
            <dd>{displayTime(time.updated)}</dd>
          </div>
        </dl>
      </section>

      <section className="conversation">
        {messages.length ? (
          messages.map((message) => {
            const role = string(message.role) ?? "assistant"
            return (
              <article className={`message ${role}`} key={string(message.id)}>
                <aside>
                  <span className="avatar">{role === "user" ? "U" : "R"}</span>
                  <strong>{role === "user" ? "You" : "Assistant"}</strong>
                  <time>{displayTime(isObject(message.time) ? message.time.created : undefined)}</time>
                </aside>
                <div className="messageBody">
                  {message.parts.map((part, index) => (
                    <Part key={`${string(part.id) ?? "part"}-${index}`} part={part} />
                  ))}
                </div>
              </article>
            )
          })
        ) : (
          <div className="emptyState">
            <span>⌁</span>
            <h2>等待会话内容</h2>
            <p>分享已创建；客户端完成首次同步后，消息会自动出现在这里。</p>
          </div>
        )}
      </section>

      <footer className="shareFooter">
        <span>Last synced {new Date(view.updatedAt).toLocaleTimeString("zh-CN")}</span>
        <span>Public read · Secret-protected write</span>
      </footer>
    </main>
  )
}
