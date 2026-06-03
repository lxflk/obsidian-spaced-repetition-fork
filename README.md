# Obsidian Spaced Repetition - Setup

Run these commands from the project root.

## Install pnpm

```bash
npm install -g pnpm@9.10.0
```

Installs `pnpm` globally so the `pnpm` command is available in your shell.

## Install Dependencies

```bash
pnpm install
```

Installs the project dependencies from `pnpm-lock.yaml` into `node_modules`.

## Build Plugin Files

```bash
pnpm build
```

Builds the plugin and creates or updates `main.js` and `styles.css` in the project root.

## Copy Files To Obsidian

```bash
cp main.js styles.css manifest.json ~/Nextcloud/luis-brain/.obsidian/plugins/obsidian-spaced-repetition/
```

Copies the rebuilt plugin files into the Obsidian vault plugin folder.
