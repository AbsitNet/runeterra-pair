# Runeterra Pair

[Русская версия](README.md)

A test for anyone who has ever wondered which League of Legends champion they'd actually get along with. I made it because my wife asked me to.

Play it here: **https://absitnet.github.io/runeterra-pair/** (the interface is Russian-only for now, translations are planned)

## How it works

Two champions show up and you pick the one you'd rather be with. Then the next pair, and the one after that. There's no "can't decide" button, on purpose: every pick has to mean something, otherwise the result is mush.

Losing once doesn't knock anyone out. Everyone plays a few Swiss rounds against champions with a similar score. After that, the ones whose place is still unclear keep fighting until it isn't. The best of them go into a double-elimination playoff, and the grand final is one on one.

At the end you get a full tier list, your "type", a few joke achievements, three champions it would never work out with (and why), and a compatibility certificate you can save as a picture and send to whoever needs to see it. Every winner comes with a line from their official bio, shown on the results screen and on the certificate.

There's also a heart map: a stylised map of Runeterra marking where your top 20 come from. And stats across all players: how rare your pick is and who ends up as someone's pair most often. They're anonymous: only the final pair and the top 10 are stored, no names.

You can also check whether it's mutual. The winner asks you seven questions (about dates, fights, their dark side and where you'd live together) and works out a mutual-feelings score based on their personality.

You can share your result as a link. It opens your tier list for anyone, no room needed.

There are 138 champions in the pool, adults only: no kids, no yordles. Rhaast and Kayn count as two different people, and so do Wolf and Lamb. Monsters like Kha'Zix and Warwick can be switched off with one toggle.

A full run takes 10 to 40 minutes depending on the mode. The quick one finds your pair just as reliably; only the middle and bottom of the tier list come out rougher. If you don't have that long, there are mini-tournaments of 16 that take about three minutes: Ionia, Noxus, Demacia, Piltover and Zaun, villains, mages, assassins, or only the newest champions. On a phone you can swipe instead of tapping.

If you don't feel like picking from pairs, there's the Star Matchmaker. You answer 32 questions about yourself: your temperament, what you value, your ideal evening and how you fight. The matchmaker compares your answers with every champion's personality across nine traits, names your pair, explains why, and offers to check it with a tournament of your 16 best matches.

You can install it on your phone like an app: "Install" in Chrome, or Share → "Add to Home Screen" on an iPhone. After the first launch, solo mode works offline too.

## Playing together

Create a room, send the link, and each of you plays your own tournament on your own device. You can bet on who the other person will end up with; bets close once they reach the playoffs. You can see how far the other person has got, and once they're in the playoffs you get live updates: who they're choosing between and who they picked. You can reply with a reaction. If you hate spoilers, switch it off in the room.

Once you're both done you get a comparison: how close your tastes are and whose bet paid off.

Then your two winners meet in one last duel, the battle of tastes, and you both vote. There's a joint certificate for the two of you, signed by your shared favourites as witnesses, and a little guessing game where you try to predict the other person's picks.

Or you can play a shared tournament: random champions or a theme, with the same pair on both screens at the same time. You pick the length: quick (16 champions, about three minutes), normal (16, about seven) or thorough (32, about a quarter of an hour). You each pick in secret and the answers are revealed together. If you disagree, you get one re-vote, and after that a coin toss decides. At the end you get a shared tier list for the couple and how often you agreed.

## Running it yourself

There's no build step, it's a plain static site. Any local server will do:

```bash
python3 -m http.server 8000
```

then open http://localhost:8000.

The two-player room and the anonymous stats run on Supabase. Apply the migrations from `supabase/migrations/` and put your project URL and publishable key into `js/config.js`. Keeping the publishable key in the repo is fine: the tables are locked down with RLS, and the browser only reaches the database through a few `pair_*` and `stats_*` functions. Rooms nobody has opened for 90 days are deleted automatically.

No Supabase handy? Open two tabs with `?room-backend=local` and the room will work inside your browser.

For GitHub Pages: Settings → Pages → Deploy from a branch → `main`, `/ (root)`.

The tournament logic is in `js/engine.js`, the champion write-ups in `js/profiles.js`, and the interface in `js/app.js`.

## Feature tracker

What already works and what's planned. Everything left on the plan is a big chunk of work, several evenings each.

### Done

Tournament:

- [x] One-of-two duels, with no "can't decide" button
- [x] Swiss rounds, placement battles and a double-elimination playoff
- [x] Three tournament lengths: quick (about 10 minutes), normal and thorough
- [x] Who's in: everyone, only men or only women, with or without monsters
- [x] Remove anyone you definitely don't like before you start
- [x] A bet before you start: who do you think will win
- [x] Lore pairs with special questions: Kayn and Rhaast, Vi and Jinx, Leona and Diana and more
- [x] Undo the last pick and replay the final
- [x] Progress is saved in the browser, so you can come back and continue
- [x] Swipes on a phone
- [x] Mini-tournaments of 16: Ionia, Noxus, Demacia, Piltover and Zaun, villains, mages, assassins, newest champions
- [x] The Star Matchmaker: 32 questions about yourself instead of duels, a pair matched by personality with an explanation, and a tournament of your 16 best matches

Results:

- [x] A tier list you can save as a picture
- [x] Your type, favourite region and favourite class
- [x] Joke achievements
- [x] "Never ever": the bottom three and why
- [x] The playoff bracket
- [x] A compatibility certificate with the seal and registrar of the winner's home region
- [x] The winner's quote on the results screen and the certificate
- [x] A link to your result: the tier list opens for anyone, no room needed
- [x] Heart map: where your top 20 come from, as a picture you can download
- [x] Stats across all players: how rare your pick is and who gets picked the most
- [x] Mutual feelings: the winner asks seven questions and works out a score

Playing together:

- [x] A room you join by link, each of you plays your own tournament on your own device
- [x] You can see how far your partner has got
- [x] A comparison: shared favourites, biggest disagreements, shared anti-top
- [x] The "Guess my pick" mini-game
- [x] Betting on your partner's pair
- [x] Battle of tastes: your winners meet in one last duel and you both vote
- [x] A joint certificate, signed by your shared favourites as witnesses
- [x] Live updates from your partner's playoffs with reactions, and a switch for spoiler haters
- [x] Shared tournament: the same pair for both of you, secret picks, a re-vote and a coin toss, a shared tier list, three lengths to choose from

Everywhere:

- [x] Works on phones, tablets and desktops, with a separate layout for portrait phones
- [x] Installs like an app, solo mode works offline

### Planned

| Feature | What it is | Difficulty |
|---|---|---|
| English, German and French | Translating the interface, champion write-ups and quotes | long |
| Rooms for a group | More than two people: who matches whom and a shared anti-top | long |

## Legal

Runeterra Pair isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc.

Champion names, titles and art come from Riot's Data Dragon. The Rhaast, Wolf and Lamb portraits are cropped from the official Kayn and Kindred splash art. The quotes come from the champion bios on [universe.leagueoflegends.com](https://universe.leagueoflegends.com/). The region emblems on the certificate seals are Runeterra region icons from Teamfight Tactics (vector versions from the [world-runes](https://github.com/choicallum/world-runes) project), plus the Runeterra emblem from the Legends of Runeterra Data Dragon.
