defmodule Report.NatsPublisher do
  @moduledoc """
  NATS JetStream publisher for Report Service events.

  Publishes events to NATS when reports are created or escalated.
  Uses the `gnat` library for NATS connectivity.

  ## Configuration

  Configure in your config:

      config :report, Report.NatsPublisher,
        url: "nats://localhost:4222",
        enabled: true

  ## Subjects

  - `report.created` - Published when a new report is created
  - `report.escalated` - Published when a report is escalated

  ## Usage

      Report.NatsPublisher.publish_report_created(report)
      Report.NatsPublisher.publish_report_escalated(report)
  """

  require Logger

  @doc """
  Publishes a report.created event to NATS.
  """
  def publish_report_created(report) do
    payload = %{
      event: "report.created",
      timestamp: DateTime.utc_now() |> DateTime.to_iso8601(),
      data: %{
        report_id: report.id,
        category: report.category,
        authority_department: report.authority_department,
        privacy_level: report.privacy_level,
        status: report.status,
        created_at: report.created_at |> DateTime.to_iso8601()
      }
    }

    publish("report.created", payload)
  end

  @doc """
  Publishes a report.escalated event to NATS.
  """
  def publish_report_escalated(report) do
    payload = %{
      event: "report.escalated",
      timestamp: DateTime.utc_now() |> DateTime.to_iso8601(),
      data: %{
        report_id: report.id,
        category: report.category,
        authority_department: report.authority_department,
        previous_status: "submitted",
        new_status: "escalated",
        escalated_at: report.escalated_at |> DateTime.to_iso8601()
      }
    }

    publish("report.escalated", payload)
  end

  @doc """
  Generic publish function to NATS.
  """
  def publish(subject, payload) do
    config = get_config()

    if config.enabled do
      do_publish(subject, payload, config)
    else
      Logger.debug("[NatsPublisher] NATS publishing disabled, skipping #{subject}")
      {:ok, :disabled}
    end
  end

  # ============================================================================
  # Private Functions
  # ============================================================================

  defp get_config do
    app_config = Application.get_env(:report, __MODULE__, [])

    %{
      url: Keyword.get(app_config, :url, "nats://localhost:4222"),
      enabled: Keyword.get(app_config, :enabled, true),
      connection_name: Keyword.get(app_config, :connection_name, :report_nats)
    }
  end

  defp do_publish(subject, payload, config) do
    try do
      # Encode payload to JSON
      json_payload = Jason.encode!(payload)

      # Get or establish connection
      case get_connection(config) do
        {:ok, conn} ->
          :ok = Gnat.pub(conn, subject, json_payload)
          Logger.info("[NatsPublisher] Published to #{subject}: #{inspect(payload.data)}")
          Report.Telemetry.nats_publish(subject, "success")
          {:ok, :published}

        {:error, reason} ->
          Logger.error("[NatsPublisher] Failed to get connection: #{inspect(reason)}")
          Report.Telemetry.nats_publish(subject, "connection_error")
          {:error, reason}
      end
    rescue
      e ->
        Logger.error("[NatsPublisher] Failed to publish to #{subject}: #{inspect(e)}")
        Report.Telemetry.nats_publish(subject, "error")
        {:error, e}
    end
  end

  defp get_connection(config) do
    # Check if we already have a registered connection
    case Process.whereis(config.connection_name) do
      nil ->
        # Start new connection
        start_connection(config)

      pid when is_pid(pid) ->
        if Process.alive?(pid) do
          {:ok, config.connection_name}
        else
          start_connection(config)
        end
    end
  end

  defp start_connection(config) do
    connection_settings = %{
      host: parse_host(config.url),
      port: parse_port(config.url)
    }

    case Gnat.start_link(connection_settings, name: config.connection_name) do
      {:ok, _pid} ->
        Logger.info("[NatsPublisher] Connected to NATS at #{config.url}")
        {:ok, config.connection_name}

      {:error, reason} ->
        Logger.error("[NatsPublisher] Failed to connect to NATS: #{inspect(reason)}")
        {:error, reason}
    end
  end

  defp parse_host(url) do
    url
    |> String.replace("nats://", "")
    |> String.split(":")
    |> List.first()
    |> String.to_charlist()
  end

  defp parse_port(url) do
    case url |> String.replace("nats://", "") |> String.split(":") do
      [_host, port] -> String.to_integer(port)
      [_host] -> 4222
    end
  end
end
