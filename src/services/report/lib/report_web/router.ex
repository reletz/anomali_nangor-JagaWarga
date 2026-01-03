defmodule ReportWeb.Router do
  use ReportWeb, :router

  pipeline :api do
    plug :accepts, ["json"]
  end

  # Health check endpoint (no pipeline needed)
  scope "/", ReportWeb do
    get "/health", HealthController, :index
  end

  scope "/api", ReportWeb do
    pipe_through :api

    # Report endpoints
    # GET  /api/reports          - List all reports
    # GET  /api/reports?department=X - List reports by department
    # POST /api/reports          - Create a new report
    # GET  /api/reports/:id      - Get a single report
    resources "/reports", ReportController, only: [:index, :create, :show]
  end

  # Enable LiveDashboard and Swoosh mailbox preview in development
  if Application.compile_env(:report, :dev_routes) do
    # If you want to use the LiveDashboard in production, you should put
    # it behind authentication and allow only admins to access it.
    # If your application does not have an admins-only section yet,
    # you can use Plug.BasicAuth to set up some basic authentication
    # as long as you are also using SSL (which you should anyway).
    import Phoenix.LiveDashboard.Router

    scope "/dev" do
      pipe_through [:fetch_session, :protect_from_forgery]

      live_dashboard "/dashboard", metrics: ReportWeb.Telemetry
      forward "/mailbox", Plug.Swoosh.MailboxPreview
    end
  end
end
