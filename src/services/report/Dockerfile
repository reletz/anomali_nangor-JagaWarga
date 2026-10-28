FROM hexpm/elixir:1.18.4-erlang-27.3.4.16-alpine-3.24.1 AS build
ENV MIX_ENV=prod
WORKDIR /app
RUN apk add --no-cache build-base git ca-certificates \
    && mix local.hex --force && mix local.rebar --force
COPY mix.exs mix.lock ./
COPY config/ config/
RUN mix deps.get --only prod && mix deps.compile
COPY lib/ lib/
COPY priv/ priv/
RUN mix compile && mix release

FROM alpine:3.24@sha256:be2656061b536c1883c4034790e21d0a09c5aaaf51968b89368a3c0371ea2c9a
RUN apk add --no-cache libstdc++ openssl ncurses-libs ca-certificates \
    && addgroup -g 1000 app && adduser -D -u 1000 -G app -h /app app
ENV PHX_SERVER=true LANG=C.UTF-8 HOME=/tmp ERL_CRASH_DUMP=/tmp/erl_crash.dump
WORKDIR /app
COPY --from=build --chown=1000:1000 /app/_build/prod/rel/report/ ./
USER 1000:1000
EXPOSE 4000
CMD ["/app/bin/report", "start"]
