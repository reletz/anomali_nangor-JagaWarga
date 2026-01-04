FROM elixir:alpine

RUN apk add --no-cache build-base git inotify-tools
WORKDIR /app
RUN mix local.hex --force && \
    mix local.rebar --force
COPY mix.exs mix.lock* ./
RUN mix deps.get
COPY . .
RUN mix do compile
EXPOSE 4000

# Auto-migrate and start server
# Get deps again in case volume mount overwrites them
CMD ["sh", "-c", "mix deps.get && mix ecto.migrate && mix phx.server"]