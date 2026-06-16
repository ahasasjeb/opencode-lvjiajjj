const content = await Bun.file("src/config/keybind.ts").text()
const lines = content.split("\n")
const entries: Array<[string, string]> = []
for (const line of lines) {
  const match = line.match(/^\s+"?([\w.]+)"?: keybind\((.+),\s*"([^"]+)"\),?\s*$/)
  if (match) entries.push([match[1], match[3]])
}
for (const [name, desc] of entries) {
  console.log(`  "keybind.${name}": ${JSON.stringify(desc)},`)
}