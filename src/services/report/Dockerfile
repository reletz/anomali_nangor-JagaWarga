FROM elixir:alpine

RUN apk add --no-cache build-base git inotify-tools
WORKDIR /app
RUN mix local.hex --force && \
    mix local.rebar --force
COPY mix.exs ./
RUN mix deps.get
COPY . .
RUN mix do compile
EXPOSE 4000

ENTRYPOINT ["mix", "phx.server"]