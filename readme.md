# Vanilla JavaScript App

[Azure Static Web Apps](https://docs.microsoft.com/azure/static-web-apps/overview) allows you to easily build JavaScript apps in minutes. Use this repo with the [quickstart](https://docs.microsoft.com/azure/static-web-apps/getting-started?tabs=vanilla-javascript) to build and customize a new static site.

This repo is used as a starter for a _very basic_ HTML web application using no front-end frameworks.

This repo has a dev container. This means if you open it inside a [GitHub Codespace](https://github.com/features/codespaces), or using [VS Code with the remote containers extension](https://code.visualstudio.com/docs/remote/containers), it will be opened inside a container with all the dependencies already installed.

## Newsletter API on Azure Static Web Apps

The newsletter endpoint is implemented as an Azure Function at `POST /api/newsletter` in the `api/` folder.

Set these **Application settings** in your Azure Static Web App:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`
- `NEWSLETTER_TO` (optional, defaults to `newsletter@andres.ch`)

After saving settings, redeploy (or restart) the Static Web App so the API picks up the values.


## Setup
checkout

```
cd src
npm update
npm start
```


