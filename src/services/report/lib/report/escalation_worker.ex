defmodule Report.EscalationWorker do
  @moduledoc """
  GenServer that periodically checks for stale reports and escalates them.

  A report is considered "stale" if:
  - Status is "submitted"
  - Created more than @stale_threshold_sec seconds ago

  The worker runs every @check_interval_ms milliseconds.

  ## Configuration

  Configure via application environment:

      config :report, Report.EscalationWorker,
        check_interval_ms: 10_000,
        stale_threshold_sec: 30,
        enabled: true

  ## Usage

  The worker is automatically started by the application supervisor.
  To manually check status:

      Report.EscalationWorker.status()

  """
  use GenServer
  require Logger

  alias Report.Reports

  # Default configuration
  # Check every 10 seconds
  @default_check_interval_ms 10_000
  # Reports older than 30s are stale
  @default_stale_threshold_sec 30

  # ============================================================================
  # Client API
  # ============================================================================

  @doc """
  Starts the Escalation Worker GenServer.
  """
  def start_link(opts \\ []) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  @doc """
  Returns the current status of the worker.
  """
  def status do
    GenServer.call(__MODULE__, :status)
  end

  @doc """
  Manually trigger an escalation check.
  Useful for testing.
  """
  def check_now do
    GenServer.cast(__MODULE__, :check_now)
  end

  # ============================================================================
  # Server Callbacks
  # ============================================================================

  @impl true
  def init(_opts) do
    config = get_config()

    if config.enabled do
      Logger.info("""
      [EscalationWorker] Started
        - Check interval: #{config.check_interval_ms}ms
        - Stale threshold: #{config.stale_threshold_sec}s
      """)

      # Schedule first check
      schedule_check(config.check_interval_ms)

      {:ok,
       %{
         config: config,
         last_check: nil,
         total_escalated: 0,
         checks_performed: 0
       }}
    else
      Logger.info("[EscalationWorker] Disabled via configuration")
      {:ok, %{config: config, enabled: false}}
    end
  end

  @impl true
  def handle_info(:check_stale_reports, state) do
    new_state = perform_escalation_check(state)
    schedule_check(state.config.check_interval_ms)
    {:noreply, new_state}
  end

  @impl true
  def handle_call(:status, _from, state) do
    {:reply, state, state}
  end

  @impl true
  def handle_cast(:check_now, state) do
    new_state = perform_escalation_check(state)
    {:noreply, new_state}
  end

  # ============================================================================
  # Private Functions
  # ============================================================================

  defp get_config do
    app_config = Application.get_env(:report, __MODULE__, [])

    %{
      check_interval_ms: Keyword.get(app_config, :check_interval_ms, @default_check_interval_ms),
      stale_threshold_sec:
        Keyword.get(app_config, :stale_threshold_sec, @default_stale_threshold_sec),
      enabled: Keyword.get(app_config, :enabled, true)
    }
  end

  defp schedule_check(interval_ms) do
    Process.send_after(self(), :check_stale_reports, interval_ms)
  end

  defp perform_escalation_check(state) do
    threshold_sec = state.config.stale_threshold_sec
    start_time = System.monotonic_time(:millisecond)

    # Calculate cutoff time (now - threshold)
    cutoff =
      DateTime.utc_now()
      |> DateTime.add(-threshold_sec, :second)
      |> DateTime.truncate(:second)

    # Query for stale reports
    stale_reports = Reports.list_stale_reports(cutoff)
    escalated_count = escalate_reports(stale_reports)

    # Emit telemetry for metrics
    duration_ms = System.monotonic_time(:millisecond) - start_time
    Report.Telemetry.escalation_check_completed(duration_ms, escalated_count)

    # Update state
    %{
      state
      | last_check: DateTime.utc_now(),
        total_escalated: state.total_escalated + escalated_count,
        checks_performed: state.checks_performed + 1
    }
  end

  defp escalate_reports([]), do: 0

  defp escalate_reports(reports) do
    Logger.info("[EscalationWorker] Found #{length(reports)} stale report(s) to escalate")

    escalated =
      reports
      |> Enum.map(&escalate_single_report/1)
      |> Enum.count(fn result -> result == :ok end)

    Logger.info(
      "[EscalationWorker] Successfully escalated #{escalated}/#{length(reports)} reports"
    )

    escalated
  end

  defp escalate_single_report(report) do
    case Reports.escalate_report(report) do
      {:ok, escalated} ->
        age_seconds = DateTime.diff(DateTime.utc_now(), report.created_at, :second)

        Logger.info("""
        [EscalationWorker] Escalated report
          - ID: #{escalated.id}
          - Category: #{report.category}
          - Department: #{report.authority_department}
          - Age: #{age_seconds}s
          - Escalated at: #{escalated.escalated_at}
        """)

        # Emit telemetry for metrics
        Report.Telemetry.report_escalated(escalated)

        # Publish NATS event (async)
        Task.start(fn ->
          Report.NatsPublisher.publish_report_escalated(escalated)
        end)

        :ok

      {:error, changeset} ->
        Logger.error("""
        [EscalationWorker] Failed to escalate report #{report.id}
          - Errors: #{inspect(changeset.errors)}
        """)

        :error
    end
  end
end
