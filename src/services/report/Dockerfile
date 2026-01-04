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

# Get deps again at runtime in case volume mount overwrites them
CMD ["sh", "-c", "mix deps.get && mix phx.server"]