import Config

# TLS terminates at ingress; internal service calls and kubelet probes use HTTP.
config :swoosh, api_client: Swoosh.ApiClient.Req
config :swoosh, local: false
config :logger, level: :info
