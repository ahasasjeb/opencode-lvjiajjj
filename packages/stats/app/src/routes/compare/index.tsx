import "../index.css"
import { Meta, Title } from "@solidjs/meta"
import { ProviderIcon } from "@opencode-ai/ui/provider-icon"
import { createAsync } from "@solidjs/router"
import { createEffect, createMemo, createSignal, For, onMount, Show } from "solid-js"
import { getRequestEvent } from "solid-js/web"
import { LocaleLinks } from "../../component/locale-links"
import { useI18n } from "../../context/i18n"
import { useLanguage } from "../../context/language"
import { localizedUrl } from "../../lib/language"
import {
  ComparisonCardsSection,
  comparisonHref,
  modelRefFromCatalog,
  type ComparisonModelRef,
  type ComparisonPair,
} from "../compare-cards"
import { formatCatalogLabName, getModelCatalog, type ModelCatalogEntry } from "../model-catalog"
import { setStatsPageCacheHeaders } from "../stats-cache"
import {
  applyThemePreference,
  Footer,
  getGitHubStars,
  Header,
  isThemePreference,
  themeStorageKey,
  type HeaderLink,
  type ThemePreference,
} from "../stats-shell"

const comparePath = "/data/compare"
const statsUnfurlPath = "banner.png"
const uptimeBars = Array.from({ length: 10 }, (_, index) => index)
const heroLabs = [
  { lab: "deepseek", label: "DeepSeek" },
  { lab: "openai", label: "OpenAI" },
  { lab: "anthropic", label: "Anthropic" },
] as const
const categoryKinds = ["flagship", "affordable", "code", "image"] as const

type CompareSlot = "first" | "second"
type Translate = ReturnType<typeof useI18n>["t"]

export default function ModelCompareIndex() {
  const i18n = useI18n()
  const language = useLanguage()
  const event = getRequestEvent()
  setStatsPageCacheHeaders(event?.response.headers)
  const catalog = createAsync(() => getModelCatalog())
  const githubStars = createAsync(() => getGitHubStars())
  const [themePreference, setThemePreference] = createSignal<ThemePreference>("system")
  const compareUrl = createMemo(() => localizedUrl(language.locale(), comparePath))
  const statsUnfurlUrl = new URL(statsUnfurlPath, localizedUrl("en", "/data/")).toString()
  const featuredModels = createMemo(() => (catalog()?.models ?? []).slice(0, 120))
  const categories = createMemo(() => buildComparisonCategories(featuredModels(), i18n.t))
  const compareTitle = () => i18n.t("compare.title")
  const compareDescription = () => i18n.t("compare.description")
  const compareHeaderLinks = createMemo<readonly HeaderLink[]>(() => [
    { href: `${import.meta.env.BASE_URL}#top-models`, label: i18n.t("nav.topModels") },
    { href: `${import.meta.env.BASE_URL}#leaderboard`, label: i18n.t("nav.leaderboard") },
    { href: `${import.meta.env.BASE_URL}#market-share`, label: i18n.t("nav.marketShare") },
    { href: `${import.meta.env.BASE_URL}#token-cost`, label: i18n.t("nav.tokenCost") },
    { href: `${import.meta.env.BASE_URL}#session-cost`, label: i18n.t("nav.sessionCost") },
  ])
  const compareFooterLinks = createMemo<readonly HeaderLink[]>(() => [
    { href: `${import.meta.env.BASE_URL}#top-models`, label: i18n.t("nav.topModels") },
    { href: `${import.meta.env.BASE_URL}#leaderboard`, label: i18n.t("nav.leaderboard") },
    { href: `${import.meta.env.BASE_URL}#market-share`, label: i18n.t("nav.marketShare") },
    { href: `${import.meta.env.BASE_URL}#token-cost`, label: i18n.t("nav.tokenCost") },
    { href: `${import.meta.env.BASE_URL}#session-cost`, label: i18n.t("nav.sessionCost") },
  ])
  const updateThemePreference = (preference: ThemePreference) => {
    applyThemePreference(preference)
    setThemePreference(preference)
    if (typeof window === "undefined") return
    window.localStorage.setItem(themeStorageKey, preference)
  }

  onMount(() => {
    if (typeof window === "undefined") return
    const preference = window.localStorage.getItem(themeStorageKey)
    const nextPreference = isThemePreference(preference) ? preference : "system"
    applyThemePreference(nextPreference)
    setThemePreference(nextPreference)
  })

  return (
    <main data-page="stats" data-theme={themePreference()}>
      <Title>{compareTitle()}</Title>
      <Meta name="description" content={compareDescription()} />
      <LocaleLinks path={comparePath} />
      <Meta property="og:type" content="website" />
      <Meta property="og:site_name" content="OpenCode" />
      <Meta property="og:title" content={compareTitle()} />
      <Meta property="og:description" content={compareDescription()} />
      <Meta property="og:url" content={compareUrl()} />
      <Meta property="og:image" content={statsUnfurlUrl} />
      <Meta property="og:image:type" content="image/png" />
      <Meta property="og:image:width" content="1200" />
      <Meta property="og:image:height" content="630" />
      <Meta property="og:image:alt" content={i18n.t("app.unfurlAlt")} />
      <Meta name="twitter:card" content="summary_large_image" />
      <Meta name="twitter:title" content={compareTitle()} />
      <Meta name="twitter:description" content={compareDescription()} />
      <Meta name="twitter:image" content={statsUnfurlUrl} />
      <Meta name="twitter:image:alt" content={i18n.t("app.unfurlAlt")} />
      <Header githubStars={githubStars() ?? "150K"} links={compareHeaderLinks()} brandHref={import.meta.env.BASE_URL} />
      <div data-component="container">
        <div data-component="content">
          <section id="compare-tool" data-section="compare-home-hero">
            <nav data-component="compare-home-breadcrumb" aria-label={i18n.t("compare.breadcrumb")}>
              <a data-slot="compare-home-crumb" href={language.route(import.meta.env.BASE_URL)}>
                {i18n.t("compare.breadcrumbData")}
              </a>
              <span data-slot="compare-home-separator">/</span>
              <span data-slot="compare-home-crumb" data-current="true">
                {i18n.t("compare.breadcrumbCompare")}
              </span>
            </nav>
            <div data-slot="compare-home-hero-grid">
              <h1 aria-label={i18n.t("compare.heroAria")}>
                <span>{i18n.t("compare.heroCompare")}</span>
                <HeroModelStack />
                <span>{i18n.t("compare.heroAiModels")}</span>
              </h1>
              <p>{compareDescription()}</p>
            </div>
            <div data-slot="compare-home-pattern" aria-hidden="true" />
          </section>
          <section data-section="compare-home-selector" aria-label={i18n.t("compare.selectorAria")}>
            <Show
              when={featuredModels().length > 1}
              fallback={
                <div data-component="empty-state" data-compact="true">
                  <strong>{i18n.t("compare.emptyTitle")}</strong>
                  <p>{i18n.t("compare.emptyDescription")}</p>
                </div>
              }
            >
              <CompareHomeSelector models={featuredModels()} />
            </Show>
          </section>
          <ComparisonCardsSection
            pairs={categories()}
            title={i18n.t("compare.relatedTitle")}
            description={i18n.t("compare.relatedDescription")}
            variant="featured"
          />
        </div>
        <Footer
          themePreference={themePreference()}
          onThemePreferenceChange={updateThemePreference}
          links={compareFooterLinks()}
          bridge={null}
        />
      </div>
    </main>
  )
}

function CompareHomeSelector(props: { models: ModelCatalogEntry[] }) {
  const i18n = useI18n()
  const [firstId, setFirstId] = createSignal("")
  const [secondId, setSecondId] = createSignal("")
  const [activeSlot, setActiveSlot] = createSignal<CompareSlot>()
  const modelById = createMemo(() => new Map(props.models.map((model) => [model.id, model])))
  const first = createMemo(() => modelById().get(firstId()))
  const second = createMemo(() => modelById().get(secondId()))
  const activeSelected = createMemo(() => (activeSlot() === "first" ? first() : second()))
  const activeBlockedId = createMemo(() => (activeSlot() === "first" ? secondId() : firstId()))
  const href = createMemo(() => {
    const firstModel = first()
    const secondModel = second()
    if (!firstModel || !secondModel || firstModel.id === secondModel.id) return undefined
    return comparisonHref(modelRefFromCatalog(firstModel), modelRefFromCatalog(secondModel))
  })

  createEffect(() => {
    if (!secondId() || secondId() !== firstId()) return
    setSecondId("")
  })

  createEffect(() => {
    const url = href()
    if (!url || typeof window === "undefined") return
    window.location.href = url
  })

  return (
    <form
      data-component="compare-home-selector"
      aria-label={i18n.t("compare.selectorLabel")}
      onSubmit={(event) => event.preventDefault()}
    >
      <CompareHomeSelect
        selected={first()}
        label={i18n.t("compare.firstModel")}
        expanded={activeSlot() === "first"}
        onOpen={() => setActiveSlot("first")}
      />
      <CompareHomeSelect
        selected={second()}
        label={i18n.t("compare.secondModel")}
        expanded={activeSlot() === "second"}
        onOpen={() => setActiveSlot("second")}
      />
      <Show when={activeSlot()}>
        {(slot) => (
          <CompareModelSelectModal
            models={props.models}
            selected={activeSelected()}
            blockedId={activeBlockedId()}
            label={slot() === "first" ? i18n.t("compare.chooseFirst") : i18n.t("compare.chooseSecond")}
            onClose={() => setActiveSlot(undefined)}
            onSelect={(model) => {
              if (slot() === "first") setFirstId(model.id)
              if (slot() === "second") setSecondId(model.id)
              setActiveSlot(undefined)
            }}
          />
        )}
      </Show>
    </form>
  )
}

function CompareHomeSelect(props: {
  selected: ModelCatalogEntry | undefined
  label: string
  expanded: boolean
  onOpen: () => void
}) {
  const i18n = useI18n()
  return (
    <button
      type="button"
      data-slot="compare-home-select-panel"
      data-selected={props.selected ? "true" : undefined}
      aria-label={props.label}
      aria-haspopup="dialog"
      aria-expanded={props.expanded}
      onClick={props.onOpen}
    >
      <span data-slot="compare-home-select-copy">
        <span data-slot="compare-home-plus" aria-hidden="true">
          +
        </span>
        <Show when={props.selected}>{(model) => <ModelAvatar model={model()} size="tiny" />}</Show>
        <span data-slot="compare-home-select-name">{props.selected?.name ?? i18n.t("compare.selectModel")}</span>
      </span>
    </button>
  )
}

function CompareModelSelectModal(props: {
  models: ModelCatalogEntry[]
  selected: ModelCatalogEntry | undefined
  blockedId: string
  label: string
  onClose: () => void
  onSelect: (model: ModelCatalogEntry) => void
}) {
  const i18n = useI18n()
  let searchInput: HTMLInputElement | undefined
  const [search, setSearch] = createSignal("")
  const [previewId, setPreviewId] = createSignal(props.selected?.id ?? "")
  const availableModels = createMemo(() => props.models.filter((model) => model.id !== props.blockedId))
  const filteredModels = createMemo(() => {
    const terms = search().trim().toLowerCase().split(/\s+/).filter(Boolean)
    if (terms.length === 0) return availableModels()
    return availableModels().filter((model) => terms.every((term) => modelSearchText(model).includes(term)))
  })
  const preview = createMemo(
    () => filteredModels().find((model) => model.id === previewId()) ?? filteredModels()[0] ?? availableModels()[0],
  )

  createEffect(() => {
    const selected = props.selected
    const fallback = selected && selected.id !== props.blockedId ? selected.id : filteredModels()[0]?.id
    if (!fallback) return
    if (availableModels().some((model) => model.id === previewId())) return
    setPreviewId(fallback)
  })

  createEffect(() => {
    const models = filteredModels()
    if (models.some((model) => model.id === previewId())) return
    setPreviewId(models[0]?.id ?? "")
  })

  createEffect(() => {
    if (typeof window === "undefined") return
    window.requestAnimationFrame(() => searchInput?.focus())
  })

  return (
    <div
      data-component="compare-model-modal-scrim"
      role="presentation"
      onClick={props.onClose}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return
        props.onClose()
      }}
    >
      <div
        data-component="compare-model-modal"
        role="dialog"
        aria-modal="true"
        aria-label={props.label}
        onClick={(event) => event.stopPropagation()}
      >
        <div data-slot="compare-model-modal-list">
          <label data-slot="compare-model-modal-search">
            <span data-slot="compare-model-modal-search-icon" aria-hidden="true" />
            <input
              ref={searchInput}
              value={search()}
              placeholder={i18n.t("compare.searchModels")}
              aria-label={i18n.t("compare.searchModels")}
              onInput={(event) => setSearch(event.currentTarget.value)}
            />
          </label>
          <div data-slot="compare-model-modal-results">
            <Show
              when={filteredModels().length > 0}
              fallback={
                <div data-slot="compare-model-modal-empty">
                  <strong>{i18n.t("compare.emptyTitle")}</strong>
                  <span>{i18n.t("compare.tryAnotherSearch")}</span>
                </div>
              }
            >
              <For each={filteredModels()}>
                {(model) => (
                  <button
                    type="button"
                    data-slot="compare-model-modal-row"
                    data-active={preview()?.id === model.id ? "true" : undefined}
                    onPointerEnter={() => setPreviewId(model.id)}
                    onFocus={() => setPreviewId(model.id)}
                    onClick={() => props.onSelect(model)}
                  >
                    <span data-slot="compare-model-modal-row-main">
                      <ModelAvatar model={model} size="tiny" />
                      <span>{model.name}</span>
                    </span>
                    <Show when={isFreeModel(model)}>
                      <span data-slot="compare-model-modal-badge">{i18n.t("compare.free")}</span>
                    </Show>
                  </button>
                )}
              </For>
            </Show>
          </div>
        </div>
        <div data-slot="compare-model-modal-divider" aria-hidden="true" />
        <Show when={preview()}>{(model) => <CompareModelDetail model={model()} />}</Show>
      </div>
    </div>
  )
}

function CompareModelDetail(props: { model: ModelCatalogEntry }) {
  const i18n = useI18n()
  const unknown = () => i18n.t("compare.unknown")
  return (
    <aside data-slot="compare-model-modal-detail">
      <header data-slot="compare-model-modal-detail-header">
        <ModelAvatar model={props.model} size="small" />
        <strong>{props.model.name}</strong>
      </header>
      <div data-slot="compare-model-modal-description">
        <p>
          {props.model.description ??
            i18n.t("compare.modelFromLab", {
              name: props.model.name,
              lab: formatCatalogLabName(props.model.lab),
            })}
        </p>
        <span aria-hidden="true" />
      </div>
      <dl data-slot="compare-model-modal-facts">
        <CompareModelFact label={i18n.t("compare.fact.release")} value={formatCatalogDate(props.model.releaseDate, unknown())} />
        <CompareModelFact
          label={i18n.t("compare.fact.context")}
          value={formatCatalogLimit(props.model.limit?.context, unknown())}
        />
        <CompareModelFact
          label={i18n.t("compare.fact.input")}
          value={formatCatalogUnitPrice(props.model.cost?.input, unknown())}
        />
        <CompareModelFact
          label={i18n.t("compare.fact.output")}
          value={formatCatalogUnitPrice(props.model.cost?.output, unknown())}
        />
        <div data-slot="compare-model-modal-fact">
          <dt>{i18n.t("compare.uptime")}</dt>
          <dd data-slot="compare-model-modal-uptime">
            <For each={uptimeBars}>{(bar) => <span data-active={bar < 7 ? "true" : undefined} />}</For>
          </dd>
        </div>
        <div data-slot="compare-model-modal-fact">
          <dt>{i18n.t("compare.fact.url")}</dt>
          <dd>
            <a href={modelHref(props.model)}>{formatModelUrl(props.model)}</a>
          </dd>
        </div>
      </dl>
    </aside>
  )
}

function CompareModelFact(props: { label: string; value: string }) {
  return (
    <div data-slot="compare-model-modal-fact">
      <dt>{props.label}</dt>
      <dd>{props.value}</dd>
    </div>
  )
}

function HeroModelStack() {
  return (
    <span data-slot="compare-home-avatar-stack" aria-hidden="true">
      <For each={heroLabs}>
        {(lab) => (
          <span data-slot="compare-home-avatar-frame">
            <LabLogo lab={lab.lab} label={lab.label} size="large" />
          </span>
        )}
      </For>
    </span>
  )
}

function ModelAvatar(props: { model: ModelCatalogEntry; size: "large" | "small" | "tiny" }) {
  return <LabLogo lab={props.model.lab} label={props.model.name} size={props.size} />
}

function LabLogo(props: { lab: string; label: string; size: "large" | "small" | "tiny" }) {
  const iconId = () => getProviderIconId(props.lab)

  return (
    <span data-slot="compare-home-avatar" data-lab={iconId()} data-size={props.size} aria-label={props.label}>
      <ProviderIcon aria-hidden="true" id={iconId()} />
    </span>
  )
}

function buildComparisonCategories(models: ModelCatalogEntry[], t: Translate): ComparisonPair[] {
  return categoryKinds.reduce<{ keys: Set<string>; categories: ComparisonPair[] }>(
    (result, kind, index) => {
      const candidates = categoryCandidates(kind, models)
      const pair = categoryPair(candidates, models, index, result.keys)
      if (!pair) return result
      result.keys.add(comparisonKey(pair.first, pair.second))
      const first = modelRefFromCatalog(pair.first)
      const second = modelRefFromCatalog(pair.second)
      const titleKey = `compare.category.${kind}.title` as const
      const descriptionKey = `compare.category.${kind}.description` as const
      result.categories.push({
        detail: t(titleKey),
        description: t(descriptionKey),
        first,
        second,
      })
      return result
    },
    { keys: new Set(), categories: [] },
  ).categories
}

function categoryPair(
  candidates: ModelCatalogEntry[],
  fallback: ModelCatalogEntry[],
  offset: number,
  usedKeys: Set<string>,
) {
  const pool = uniqueModels([...candidates, ...fallback.slice(offset), ...fallback])
  return pool
    .flatMap((first, firstIndex) =>
      pool.slice(firstIndex + 1).map((second) => ({
        first,
        second,
        key: comparisonKey(first, second),
      })),
    )
    .find((pair) => !usedKeys.has(pair.key))
}

function categoryCandidates(kind: (typeof categoryKinds)[number], models: ModelCatalogEntry[]) {
  if (kind === "affordable")
    return models
      .filter((model) => model.cost)
      .toSorted(
        (a, b) => modelCost(a) - modelCost(b) || displayDateTime(b.releaseDate) - displayDateTime(a.releaseDate),
      )
  if (kind === "code") return models.filter((model) => model.toolCall || model.reasoning).toSorted(recentModelSort)
  if (kind === "image")
    return models
      .filter((model) => model.modalities.output.some((modality) => modality.toLowerCase().includes("image")))
      .toSorted(recentModelSort)
  return models.toSorted(recentModelSort)
}

function uniqueModels(models: (ModelCatalogEntry | undefined)[]) {
  return models.reduce<{ keys: Set<string>; models: ModelCatalogEntry[] }>(
    (result, model) => {
      if (!model || result.keys.has(model.id)) return result
      result.keys.add(model.id)
      result.models.push(model)
      return result
    },
    { keys: new Set(), models: [] },
  ).models
}

function recentModelSort(a: ModelCatalogEntry, b: ModelCatalogEntry) {
  return displayDateTime(b.releaseDate) - displayDateTime(a.releaseDate) || a.name.localeCompare(b.name)
}

function comparisonKey(first: ModelCatalogEntry, second: ModelCatalogEntry) {
  return [first.id, second.id].toSorted().join("|")
}

function modelCost(model: ModelCatalogEntry) {
  return (model.cost?.input ?? Number.POSITIVE_INFINITY) + (model.cost?.output ?? Number.POSITIVE_INFINITY)
}

function modelSearchText(model: ModelCatalogEntry) {
  return `${model.name} ${formatCatalogLabName(model.lab)} ${model.id}`.toLowerCase()
}

function isFreeModel(model: ModelCatalogEntry) {
  return model.cost?.input === 0 && model.cost.output === 0
}

function modelHref(model: ModelCatalogEntry) {
  return `${import.meta.env.BASE_URL}${model.lab}/${model.slug}`
}

function formatModelUrl(model: ModelCatalogEntry) {
  return `.../${model.slug}`
}

function formatCatalogLimit(value: number | undefined, unknown = "Unknown") {
  return value === undefined ? unknown : formatTokens(value)
}

function formatCatalogUnitPrice(value: number | undefined, unknown = "Unknown") {
  if (value === undefined) return unknown
  return `${formatModelPrice(value)} / 1M`
}

function formatModelPrice(value: number) {
  if (value > 0 && value < 0.01) return `$${value.toFixed(4)}`
  return formatMoney(value)
}

function formatMoney(value: number) {
  if (value >= 1_000_000) return `$${trimNumber(value / 1_000_000, value >= 10_000_000 ? 0 : 1)}M`
  if (value >= 1_000) return `$${trimNumber(value / 1_000, value >= 10_000 ? 0 : 1)}K`
  return `$${value.toFixed(value >= 10 ? 0 : 2)}`
}

function formatCatalogDate(value: string | undefined, unknown = "Unknown") {
  if (!value) return unknown
  const match = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/.exec(value)
  if (!match) return value
  return new Intl.DateTimeFormat("en", {
    month: match[2] ? "short" : undefined,
    day: match[3] ? "numeric" : undefined,
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(Number(match[1]), match[2] ? Number(match[2]) - 1 : 0, match[3] ? Number(match[3]) : 1)))
}

function formatTokens(value: number) {
  if (value >= 1_000_000_000_000)
    return `${trimNumber(value / 1_000_000_000_000, value >= 10_000_000_000_000 ? 0 : 1)}T`
  if (value >= 1_000_000_000) return `${trimNumber(value / 1_000_000_000, value >= 10_000_000_000 ? 0 : 1)}B`
  if (value >= 1_000_000) return `${trimNumber(value / 1_000_000, value >= 10_000_000 ? 0 : 1)}M`
  if (value >= 1_000) return `${trimNumber(value / 1_000, value >= 10_000 ? 0 : 1)}K`
  return String(Math.round(value))
}

function trimNumber(value: number, digits: number) {
  return Number(value.toFixed(digits)).toLocaleString("en")
}

function displayDateTime(value: string | undefined) {
  if (!value) return 0
  const date = new Date(value)
  if (!Number.isNaN(date.getTime())) return date.getTime()
  const year = Number(value.match(/\d{4}/)?.[0] ?? 0)
  return Number.isFinite(year) ? year : 0
}

function getProviderIconId(provider: string) {
  const id = provider.toLowerCase().replace(/[^a-z0-9]+/g, "")
  if (id === "moonshot") return "moonshotai"
  if (id === "zhipu") return "zhipuai"
  return id
}
