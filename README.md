# mr-fb-reels

Daily MarketRadar whale reel for the English Facebook Page. Generates a vertical video (teacher whale + blackboard, real data from marketradarwhale.com), hosts it on the `gh-pages` branch and hands it to a Make scenario that uploads it to the Page.

Nothing is published unless `dry_run` is false (workflow input) or the repository variable `FB_DRY_RUN` is `false`.
