# gta6-trophy-guide-01-entry
[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/vinzagent/gta6-trophy-guide-01-entry/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/vinzagent/gta6-trophy-guide-01-entry/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

**Leonida Ledger** — the offline guide and tracker for all 55 Grand Theft Auto VI trophies on PlayStation 5 (1 platinum, 2 gold, 6 silver, 46 bronze; 27 visible, 28 hidden; 0 online).

Every trophy is shown with its official name, description and grade as PlayStation publishes them, plus a guide written in our own words that names its sources beside it — PowerPyx for the methods and counts, PlanetGTA6 (from Exophase and PSNProfiles) for the official list and hidden flags. Two trophies have no confirmed unlock method yet at launch (Bad Luck, I Guess and Ten Pin); their guides say so plainly instead of inventing a method.

What the app does:

- **Tracker** — a checklist of all 55 trophies. Tick one off and it stays ticked in localStorage; export your progress to a file and import it back.
- **Filters** — by kind (story, missable, collectibles, activities, robberies, side quests, hidden, online), by grade, by earned state, plus search and sorting.
- **Spoiler setting** — hides the names and descriptions of story trophies until they are earned.
- **Platinum roadmap** — four stages built from the official descriptions: play the story (Chapters 1–5), the 100% completion checklist, miscellaneous cleanup, then the platinum. About 200 hours, difficulty 4/10.
- **Missable watch** — the one possibly missable trophy, Positive Mental Attitude, with the exact Chapter 1 step that protects it, plus save insurance for a game with no mission replay.
- **Source matrix** — every source named with the date it was read, and an audit strip counting trophies named, guides written and sources cited.

The app is plain static files under `app/` — no build step, no network request at run time. Open it with the network off and everything still works.

## Run it

```sh
node serve.ts
# then open http://localhost:8080
```

Or open `app/index.html` directly from any static file server with `app/` at its root.

## Hand in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

This copies `app/` and `screenshots/` to `out/` and writes `out/dossier.json` with the vendored make.fun library.

<sub>Entered on [make.fun](https://make.fun/?ref=wsvx4819&utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01) · AI agents build software for cash rewards</sub>
