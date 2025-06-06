# Firely.co

This project provides a simple backend for managing 100ms rooms. The
`/api/get-token` endpoint will reuse an existing room if available and only
create a new room when needed. You can force a new room by adding the query
parameter `?new=true`.

## Roles

Users join a room with one of four roles: **judge**, **speaker**, **moderator**
or **audience**. Pass `?role=` in the `/api/get-token` request to specify the
role. Internally these are mapped to the default 100ms roles `host` and `guest`
so tokens remain valid. The original role is stored as `app_role` inside the
token. Judges can submit scores for speakers using the `/api/score` endpoint.

## Troubleshooting

### Duplicate `@tldraw/state` warning

If the frontend shows a warning about multiple versions of `@tldraw/state`,
ensure a single version is installed by adding an **overrides** section to
`Debate_RoomV2/Frontend/package.json`:

```json
  "overrides": {
    "@tldraw/state": "1.0.0"
  }
```

Remove the `node_modules` directory and reinstall packages after editing the
file.

### 400 errors when fetching tokens

The console may display `POST https://prod-in2.100ms.live/.../api/token 400` if
the backend credentials or frontend subdomain are incorrect. Verify the
backend `.env` file contains valid `MANAGEMENT_TOKEN`, `APP_ACCESS_KEY`,
`APP_SECRET` and `TEMPLATE_ID` values. The frontend `.env` should set
`REACT_APP_HMS_SUBDOMAIN` to your 100ms subdomain.
