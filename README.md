# Firely.co

This project provides a simple backend for managing 100ms rooms. The
`/api/get-token` endpoint will reuse an existing room if available and only
create a new room when needed. You can force a new room by adding the query
parameter `?new=true`.
