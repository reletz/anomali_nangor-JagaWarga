defmodule Report.PromEx.ReportPlugin do
  @moduledoc """
  Custom PromEx plugin for Report Service metrics.

  Exposes application-specific metrics:
  - Reports created counter
  - Reports escalated counter
  - Escalation check duration
  """

  use PromEx.Plugin

  @impl true
  def polling_metrics(poll_rate) do
    [
      # No polling metrics needed for now
      # Could add DB stats here if needed
    ]
  end

  @impl true
  def event_metrics(_opts) do
    Event.build(
      :report_service_event_metrics,
      [
        # Report creation counter
        counter(
          [:report, :service, :reports, :created, :total],
          event_name: [:report, :created],
          description: "Total number of reports created",
          tags: [:category, :department, :privacy_level],
          tag_values: fn metadata ->
            %{
              category: metadata[:category] || "unknown",
              department: metadata[:department] || "unknown",
              privacy_level: metadata[:privacy_level] || "unknown"
            }
          end
        ),

        # Report escalation counter
        counter(
          [:report, :service, :reports, :escalated, :total],
          event_name: [:report, :escalated],
          description: "Total number of reports escalated",
          tags: [:department],
          tag_values: fn metadata ->
            %{
              department: metadata[:department] || "unknown"
            }
          end
        ),

        # Escalation check counter
        counter(
          [:report, :service, :escalation, :checks, :total],
          event_name: [:report, :escalation, :check],
          description: "Total number of escalation checks performed"
        ),

        # Escalation check duration
        distribution(
          [:report, :service, :escalation, :check, :duration, :milliseconds],
          event_name: [:report, :escalation, :check],
          description: "Time taken to perform escalation check",
          measurement: :duration,
          unit: {:native, :millisecond},
          reporter_options: [
            buckets: [10, 50, 100, 250, 500, 1000, 2500, 5000]
          ]
        ),

        # NATS publish counter
        counter(
          [:report, :service, :nats, :publish, :total],
          event_name: [:report, :nats, :publish],
          description: "Total number of NATS events published",
          tags: [:subject, :status],
          tag_values: fn metadata ->
            %{
              subject: metadata[:subject] || "unknown",
              status: metadata[:status] || "unknown"
            }
          end
        )
      ]
    )
  end
end
