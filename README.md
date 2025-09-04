# A Map of UK Police Reported Crime 

[This app](https://leegee.github.io/crime-map-caching) accesses the [Police API](https://data.police.uk/docs/) in real time.

Out of the respect to the tax payer-funded API
[Rate limit](https://data.police.uk/docs/api-call-limits/),
makes no more than 10 requests per second, and out of respect of the user caches to Index DB, purging when reaching the maximum allowed by the storage manager.

Colours points by [crime category](https://data.police.uk/api/crime-categories) and optionally also by court disposal, the outcome - if any - of the police action.

Includes address look-up and auto-complete.

## Usage

```bash
bun install
bun dev
bun preview
bun run build
bun run deploy
```

![Screenshot](./README.png)

## To Do

* Look at moving some of it in into thw worker thread.


