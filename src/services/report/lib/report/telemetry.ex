defmodule Report.Telemetry do
  @moduledoc """
  Telemetry helper functions for emitting custom events.

  Use these functions to emit telemetry events that are then
  captured by PromEx for Prometheus metrics.

  ## Events

  - `[:report, :created]` - Emitted when a report is created
  - `[:report, :escalated]` - Emitted when a report is escalated
  - `[:report, :escalation, :check]` - Emitted after each escalation check
  - `[:report, :nats, :publish]` - Emitted when publishing to NATS
  """

  @doc """
  Emit telemetry event when a report is created.
  """
  def report_created(report) do
    :telemetry.execute(
      [:report, :created],
      %{count: 1},
      %{
        category: report.category,
        department: report.authority_department,
        privacy_level: report.privacy_level
      }
    )
  end

  @doc """
  Emit telemetry event when a report is escalated.
  """
  def report_escalated(report) do
    :telemetry.execute(
      [:report, :escalated],
      %{count: 1},
      %{
        department: report.authority_department
      }
    )
  end

  @doc """
  Emit telemetry event after an escalation check.
  """
  def escalation_check_completed(duration_ms, reports_escalated) do
    :telemetry.execute(
      [:report, :escalation, :check],
      %{duration: duration_ms, count: 1, escalated: reports_escalated},
      %{}
    )
  end

  @doc """
  Emit telemetry event when publishing to NATS.
  """
  def nats_publish(subject, status) do
    :telemetry.execute(
      [:report, :nats, :publish],
      %{count: 1},
      %{subject: subject, status: status}
    )
  end
end
