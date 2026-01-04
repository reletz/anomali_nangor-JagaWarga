defmodule ReportWeb.Plugs.CitizenAuthPlug do
  import Plug.Conn
  import Phoenix.Controller
  require Logger

  def init(opts), do: opts

  def call(conn, _opts) do
    current_user = conn.assigns[:current_user]

    cond do
      # No user assigned (AuthPlug failed)
      is_nil(current_user) ->
        conn
        |> put_status(:unauthorized)
        |> json(%{error: "Unauthorized"})
        |> halt()

      # User has department field = Authority (wrong type)
      Map.has_key?(current_user, "department") ->
        Logger.warning("Authority tried to access citizen endpoint: #{current_user["email"]}")

        conn
        |> put_status(:forbidden)
        |> json(%{
          error: "Forbidden",
          message: "This endpoint is for citizens only"
        })
        |> halt()

      Map.has_key?(current_user, "id") ->
        conn

      # Unknown user type
      true ->
        conn
        |> put_status(:forbidden)
        |> json(%{error: "Forbidden", message: "Unknown user type"})
        |> halt()
    end
  end
end
