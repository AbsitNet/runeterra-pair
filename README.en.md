# Runeterra Pair

[Русская версия](README.md)

A test for anyone who has ever wondered which League of Legends champion they'd actually get along with. I made it because my wife asked me to.

Play it here: **https://absitnet.github.io/runeterra-pair/** (the interface is Russian-only for now, translations are planned)

## How it works

Two champions show up and you pick the one you'd rather be with. Then the next pair, and the one after that. There's no "can't decide" button, on purpose: every pick has to mean something, otherwise the result is mush.

Losing once doesn't knock anyone out. Everyone plays a few Swiss rounds against champions with a similar score. After that, the ones whose place is still unclear keep fighting until it isn't. The best of them go into a double-elimination playoff, and the grand final is one on one.

At the end you get a full tier list, your "type", a few joke achievements, three champions it would never work out with (and why), and a compatibility certificate you can save as a picture and send to whoever needs to see it.

There are 138 champions in the pool, adults only: no kids, no yordles. Rhaast and Kayn count as two different people, and so do Wolf and Lamb. Monsters like Kha'Zix and Warwick can be switched off with one toggle.

A full run takes 20 to 40 minutes depending on the mode. On a phone you can swipe instead of tapping.

## Playing together

Create a room, send the link, and each of you plays your own tournament on your own device. You can see how far the other person has got, and once you're both done you can check how close your tastes are. There's also a little guessing game where you try to predict the other person's picks.

## Running it yourself

There's no build step, it's a plain static site. Any local server will do:

```bash
python3 -m http.server 8000
```

then open http://localhost:8000.

The two-player room runs on Supabase. Apply the migration from `supabase/migrations/` and put your project URL and publishable key into `js/config.js`. Keeping the publishable key in the repo is fine: the tables are locked down with RLS, and the browser only reaches the database through a few `pair_*` functions. Rooms nobody has opened for 90 days are deleted automatically.

No Supabase handy? Open two tabs with `?room-backend=local` and the room will work inside your browser.

For GitHub Pages: Settings → Pages → Deploy from a branch → `main`, `/ (root)`.

The tournament logic is in `js/engine.js`, the champion write-ups in `js/profiles.js`, and the interface in `js/app.js`.

## What's next

Ideas for future updates:

- English, German and French versions of the interface
- A joint certificate: one picture for the two of you with both winners, how close your tastes are, and your shared favourites as witnesses
- Betting on your partner: before you start, each of you guesses who the other one will end up with, and at the end you see who knows whom better
- Battle of tastes: once you're both done, your two winners meet in one last duel and you both vote
- Live reactions: when your partner reaches the playoffs, you see who they're choosing between and can send a reaction back (can be turned off if you hate spoilers)
- Synchronous duels: you both get the same pair at the same time, pick in secret, and the answers are revealed together, ending with a shared tier list for the couple
- Rooms for a whole group of friends: who matches whom and a shared anti-top

## Legal

Runeterra Pair isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc.

Champion names, titles and art come from Riot's Data Dragon. The Rhaast, Wolf and Lamb portraits are cropped from the official Kayn and Kindred splash art.
