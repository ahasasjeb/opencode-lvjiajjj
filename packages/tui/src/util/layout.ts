import type { BaseRenderable, BoxRenderable } from "@opentui/core"

const previousByParent = new WeakMap<
  BaseRenderable,
  { frameID: number; childCount: number; previous: WeakMap<BaseRenderable, BaseRenderable | undefined> }
>()

export function setPreLayoutSiblingMargin(el: BoxRenderable, margin: (previous?: BaseRenderable) => number) {
  // Run before Yoga layout so scroll geometry matches the rendered frame.
  el.onLifecyclePass = () => {
    const parent = el.parent
    if (!parent) return
    const cached = previousByParent.get(parent)
    const children = parent.getChildren()
    const previous =
      cached?.frameID === el.ctx.frameId && cached.childCount === children.length
        ? cached.previous
        : previousSiblings(parent, el.ctx.frameId, children.length)
    const value = margin(previous.get(el))
    if (el.marginTop !== value) el.marginTop = value
  }
}

function previousSiblings(parent: BaseRenderable, frameID: number, childCount: number) {
  const previous = new WeakMap<BaseRenderable, BaseRenderable | undefined>()
  parent.getChildren().forEach((child, index, children) => previous.set(child, children[index - 1]))
  previousByParent.set(parent, { frameID, childCount, previous })
  return previous
}